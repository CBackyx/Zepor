import { BrowserWindow, app } from 'electron';
import { marked } from 'marked';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray } from 'pdf-lib';
import forge from 'node-forge';

interface MarkdownPayload {
  markdown: string;
  signerId: string;
  algorithm: 'RSA-SHA256' | 'ECDSA-P256';
  privateKey: string;
  saveLocation?: string;
  sourceDocumentHash?: string;
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

const SIGNATURE_LENGTH = 8192; // Reserved space for signature

// Generate default key pairs for different algorithms
export function generateDefaultKeyPair(algorithm: string): KeyPair {
  if (algorithm === 'RSA-SHA256') {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  } else {
    // ECDSA - Note: zkPDF only supports RSA currently, but keeping this for structure
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }
}

/**
 * Generates a self-signed X.509 certificate for the given key pair.
 * Required for PKCS#7 SignedData.
 */
function generateSelfSignedCert(publicKeyPem: string, privateKeyPem: string): forge.pki.Certificate {
  const pki = forge.pki;

  // Convert PEM to forge objects
  let publicKey;
  let privateKey;

  try {
    publicKey = pki.publicKeyFromPem(publicKeyPem);
    privateKey = pki.privateKeyFromPem(privateKeyPem);
  } catch (e) {
    // Determine key type if standard import fails (e.g. EC keys in different formats)
    throw new Error(`Failed to parse keys for cert generation: ${e}`);
  }

  const cert = pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'commonName',
    value: 'Zepor Auditor'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    name: 'organizationName',
    value: 'Zepor'
  }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Sign the certificate
  cert.sign(privateKey, forge.md.sha256.create());

  return cert;
}

/**
 * Signs a PDF buffer using RSA-PKCS#1 v1.5 and SHA-256 in a PKCS#7 container.
 * Satisfies zkPDF requirements: 
 * - ByteRange with 4 integers
 * - Inline hex-encoded Contents
 * - RSASSA-PKCS1-v1_5
 */
export async function signPdf(pdfInput: Buffer | Uint8Array, privateKeyPem: string, publicKeyPem: string): Promise<Buffer> {
  // Ensure we are working with a Buffer for raw manipulation
  const pdfBuffer = Buffer.isBuffer(pdfInput) ? pdfInput : Buffer.from(pdfInput);

  // Pass Uint8Array to pdf-lib to avoid any Buffer class mismatch issues
  const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));

  // Create a placeholder for the signature
  // We use large numbers to reserve enough space in the file for the actual ByteRange
  const byteRangePlaceholder = [
    0,
    9999999999,
    9999999999,
    9999999999,
  ];

  const signatureDict = pdfDoc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: byteRangePlaceholder,
    // Placeholder for contents (must be large enough)
    Contents: PDFHexString.of('0'.repeat(SIGNATURE_LENGTH)),
    Reason: PDFString.of('Zepor Audit Proof'),
    M: PDFString.fromDate(new Date()),
  });

  const signatureRef = pdfDoc.context.register(signatureDict);

  // Add a signature widget annotation to the first page (invisible or visible, required for structure)
  const widgetDict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, 0, 0], // Invisible
    V: signatureRef,
    T: PDFString.of('Signature1'),
    F: 4,
    P: pdfDoc.getPages()[0].ref,
  });

  const widgetRef = pdfDoc.context.register(widgetDict);

  // Add the widget to the first page's Annots
  const page = pdfDoc.getPages()[0];
  page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]));

  // Add the form to the AcroForm dict
  pdfDoc.catalog.set(
    PDFName.of('AcroForm'),
    pdfDoc.context.obj({
      Fields: [widgetRef],
      SigFlags: 3,
    })
  );

  // Save the PDF with the placeholders
  // useObjectStreams: false is safer for simple parsing logic in zkPDF
  const plainPdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let plainPdfBuffer = Buffer.from(plainPdfBytes);

  // --- RAW MANIPULATION TO FILL SIGNATURE ---

  // 1. Locate the ByteRange array placeholder
  // We explicitly look for the array start `[` after finding the /ByteRange key
  const contentsSearchPattern = Buffer.from('/Contents <');
  const contentsIndex = plainPdfBuffer.indexOf(contentsSearchPattern);

  if (contentsIndex === -1) {
    throw new Error('Could not find /Contents in generated PDF');
  }

  // The ByteRange should be before /Contents
  // Look backwards for /ByteRange
  const byteRangeTag = Buffer.from('/ByteRange');
  const byteRangeIndex = plainPdfBuffer.lastIndexOf(byteRangeTag, contentsIndex);

  if (byteRangeIndex === -1) {
    throw new Error('Could not find /ByteRange in generated PDF');
  }

  // Find the start of the array `[`
  const arrayStart = plainPdfBuffer.indexOf('[', byteRangeIndex);
  const arrayEnd = plainPdfBuffer.indexOf(']', arrayStart);

  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error('Could not parse ByteRange array bounds');
  }

  // Find the start of the hex string `<`
  const placeholderStart = plainPdfBuffer.indexOf('<', contentsIndex) + 1; // skip <
  const placeholderEnd = plainPdfBuffer.indexOf('>', placeholderStart); // skip >

  if (placeholderStart === -1 || placeholderEnd === -1) {
    throw new Error('Could not parse Contents hex string bounds');
  }

  // Calculate ByteRange values
  // Range 1: 0 to start of <
  // Range 2: end of > to end of file
  const range1Start = 0;
  const range1Length = placeholderStart - 1; // exclude <
  const range2Start = placeholderEnd + 1; // exclude >
  const range2Length = plainPdfBuffer.length - range2Start;

  // 2. Update ByteRange in buffer BEFORE signing
  // The ByteRange array itself is part of the signed content, so we must write the correct values now.

  const byteRangeStr = `[${range1Start} ${range1Length} ${range2Start} ${range2Length}]`;
  const availableByteRangeSpace = arrayEnd - arrayStart + 1; // including brackets

  // Pad with spaces
  let newByteRange = byteRangeStr;
  while (newByteRange.length < availableByteRangeSpace) {
    newByteRange += ' ';
  }

  if (newByteRange.length > availableByteRangeSpace) {
    // Emergency: we don't have space.
    throw new Error('Not enough space reserved for ByteRange array. Implementation requires adjustment to reserve header space.');
  }

  // Write the new ByteRange to the buffer
  plainPdfBuffer.write(newByteRange, arrayStart);

  // 3. Generate the actual signature

  // Extract bytes to sign (now including the updated ByteRange)
  const part1 = plainPdfBuffer.subarray(range1Start, range1Start + range1Length);
  const part2 = plainPdfBuffer.subarray(range2Start, range2Start + range2Length);
  const bufferToSign = Buffer.concat([part1, part2]);

  // Create PKCS#7 signature using node-forge
  const pki = forge.pki;
  const privateKey = pki.privateKeyFromPem(privateKeyPem);
  const cert = generateSelfSignedCert(publicKeyPem, privateKeyPem);

  // Check if we need to implement SHA-256 specifically, node-forge default might be different
  // We need to create a SignedData structure
  const msg = forge.pkcs7.createSignedData();
  msg.content = forge.util.createBuffer(bufferToSign.toString('binary')); // Detached signature context, but forge needs the content to resize/hash
  msg.addCertificate(cert);

  // Add signer with RSA + SHA-256
  msg.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [{
      type: forge.pki.oids.contentType,
      value: forge.pki.oids.data
    }, {
      type: forge.pki.oids.messageDigest,
      // value computed automatically
    }, {
      type: forge.pki.oids.signingTime,
      // value populated automatically
    }]
  });

  // Sign in detached mode (signature contains hash, but not the content itself)
  msg.sign({ detached: true });

  const signatureHex = forge.asn1.toDer(msg.toAsn1()).toHex();

  // Check if signature fits
  if (signatureHex.length > (placeholderEnd - placeholderStart)) {
    throw new Error(`Generated signature is too large! Size: ${signatureHex.length}, Capacity: ${placeholderEnd - placeholderStart}`);
  }

  // Pad signature with 0s
  const paddedSignature = signatureHex + '0'.repeat((placeholderEnd - placeholderStart) - signatureHex.length);

  // 4. Write signature to buffer
  plainPdfBuffer.write(paddedSignature, placeholderStart);

  return plainPdfBuffer;
}


export async function generateProofFromMarkdown(
  payload: MarkdownPayload,
  mainWindow: BrowserWindow
): Promise<{ filePath: string; fileHash: string }> {
  const { markdown, signerId, algorithm, privateKey, saveLocation, sourceDocumentHash } = payload;

  // Determine key pair
  let privKey: string;
  let pubKey: string;

  if (privateKey && privateKey !== 'DEFAULT_KEY') {
    // User provided key
    privKey = privateKey;
    try {
      const keyObject = crypto.createPrivateKey(privKey);
      pubKey = crypto.createPublicKey(keyObject).export({ type: 'spki', format: 'pem' }) as string;
    } catch (e) {
      throw new Error('Invalid private key format');
    }
  } else {
    // Generate ephemeral key
    const keyPair = generateDefaultKeyPair(algorithm);
    privKey = keyPair.privateKey;
    pubKey = keyPair.publicKey;
  }

  // Convert Markdown to HTML using marked
  let htmlBody = await marked(markdown);
  const timestamp = new Date().toISOString();

  // Format the Document Hash display
  const documentHashDisplay = sourceDocumentHash || 'N/A (Not provided)';

  // Create beautiful HTML template
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      margin: 25mm;
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2c3e50;
      background: white;
      padding: 20px;
    }
    
    h1 {
      color: #667eea;
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 12pt;
      padding-bottom: 8pt;
      border-bottom: 3px solid #667eea;
      page-break-after: avoid;
    }
    
    h2 {
      color: #34495e;
      font-size: 18pt;
      font-weight: 600;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    
    h3 {
      color: #34495e;
      font-size: 14pt;
      font-weight: 600;
      margin-top: 18pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
    }
    
    p {
      margin-bottom: 10pt;
      text-align: left;
    }
    
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    
    em {
      font-style: italic;
      color: #555;
    }
    
    ul, ol {
      margin-left: 25pt;
      margin-bottom: 12pt;
    }
    
    li {
      margin-bottom: 6pt;
      line-height: 1.6;
    }
    
    code {
      background: #f7f7f7;
      padding: 2pt 4pt;
      border-radius: 2pt;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 9pt;
      color: #c7254e;
    }
    
    pre {
      background: #f7f7f7;
      padding: 12pt;
      border-radius: 4pt;
      border-left: 3pt solid #667eea;
      overflow-x: auto;
      margin-bottom: 12pt;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #333;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
      font-size: 10pt;
    }
    
    th, td {
      border: 1pt solid #ddd;
      padding: 8pt;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #667eea;
      color: white;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    blockquote {
      border-left: 3pt solid #667eea;
      padding-left: 12pt;
      margin: 12pt 0;
      color: #555;
      font-style: italic;
    }
    
    hr {
      border: none;
      border-top: 1pt solid #e0e0e0;
      margin: 20pt 0;
    }
    
    a {
      color: #667eea;
      text-decoration: none;
    }
    
    .metadata {
      margin-top: 40pt;
      padding-top: 20pt;
      border-top: 2pt solid #e0e0e0;
      font-size: 9pt;
      color: #666;
      background: #f9f9f9;
      padding: 15pt;
      border-radius: 4pt;
      page-break-inside: avoid;
    }
    
    .metadata-row {
      display: flex;
      margin-bottom: 6pt;
    }
    
    .metadata-label {
      font-weight: 600;
      color: #333;
      min-width: 100pt;
    }
    
    .metadata-value {
      color: #555;
      word-break: break-all;
    }
    
    .footer {
      margin-top: 30pt;
      padding-top: 15pt;
      border-top: 1pt solid #e0e0e0;
      text-align: center;
      font-size: 9pt;
      color: #999;
      page-break-inside: avoid;
    }
    
    .footer-logo {
      color: #667eea;
      font-weight: 700;
      font-size: 10pt;
    }
    
    .page-break {
      page-break-after: always;
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
</head>
<body>
  ${htmlBody}
  
  <div class="metadata">
    <div class="metadata-row">
      <span class="metadata-label">Signer ID:</span>
      <span class="metadata-value">${signerId}</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Timestamp:</span>
      <span class="metadata-value">${timestamp}</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Signing Algorithm:</span>
      <span class="metadata-value">${algorithm}</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Document Hash:</span>
      <span class="metadata-value" style="font-family: monospace; font-size: 8pt;">${documentHashDisplay}</span>
    </div>
  </div>
  
  <div class="footer">
    <p class="footer-logo">⚡ Signed Audit PDF powered by Zepor.</p>
    <p style="margin-top: 4pt; font-size: 8pt;">Cryptographically signed document • Verify authenticity using the metadata file</p>
  </div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
          ],
          throwOnError : false
        });
      }
    });
  </script>
</body>
</html>
  `;

  // Create an offscreen window to render the HTML
  const pdfWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Don't show the window
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  // Write HTML to a temporary file
  const tempHtmlPath = path.join(os.tmpdir(), `auditor-proof-${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    // Load the HTML content from file
    await pdfWindow.loadFile(tempHtmlPath);

    // Wait for content to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate PDF from the offscreen window
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true
    });

    // Close the offscreen window
    pdfWindow.close();

    // Determine save path
    let filePath: string;

    if (saveLocation) {
      // User specified save location
      filePath = saveLocation;
      if (!filePath.endsWith('.pdf')) {
        filePath += '.pdf';
      }
    } else {
      // Default location
      const documentsPath = app.getPath('documents');
      const saveDir = path.join(documentsPath, 'ZeporProofs');
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      const timestampNum = Date.now();
      const fileName = `proof_${signerId}_${timestampNum}.pdf`;
      filePath = path.join(saveDir, fileName);
    }

    // Perform zkPDF Compatible Signing
    const signedPdfBuffer = await signPdf(pdfBuffer, privKey, pubKey);

    // Save Signed PDF
    fs.writeFileSync(filePath, signedPdfBuffer);

    // Calculate hash of the FINAL signed PDF
    const fileHash = crypto.createHash('sha256').update(signedPdfBuffer).digest('hex');

    // Save metadata (optional but helpful sidecar)
    const metadataPath = filePath + '.meta.json';
    const metadata = {
      signerId,
      timestamp: new Date().toISOString(),
      timestampUnix: Date.now(),
      algorithm,
      publicKey: pubKey,
      fileHash,
      version: '1.2.0',
      generator: 'Zepor Auditor Tool'
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return { filePath, fileHash };
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempHtmlPath)) {
      try {
        fs.unlinkSync(tempHtmlPath);
      } catch (e) {
        console.error('Failed to cleanup temp file:', e);
      }
    }
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.destroy();
    }
  }
}

// Generate PDF buffer from markdown for preview (no signing, no metadata save)
export async function generatePdfPreviewFromMarkdown(markdown: string, mainWindow: BrowserWindow): Promise<Buffer> {
  // Convert Markdown to HTML
  let htmlBody = await marked(markdown);

  // Use same HTML template (without metadata/footer signing block)
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { margin: 25mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #2c3e50; background: white; padding: 20px; }
    h1 { color: #667eea; font-size: 28pt; font-weight: 700; margin-bottom: 12pt; padding-bottom: 8pt; border-bottom: 3px solid #667eea; page-break-after: avoid; }
    h2 { color: #34495e; font-size: 18pt; font-weight: 600; margin-top: 24pt; margin-bottom: 12pt; page-break-after: avoid; }
    h3 { color: #34495e; font-size: 14pt; font-weight: 600; margin-top: 18pt; margin-bottom: 10pt; page-break-after: avoid; }
    p { margin-bottom: 10pt; text-align: justify; }
    pre { background: #f7f7f7; padding: 12pt; border-radius: 4pt; border-left: 3pt solid #667eea; overflow-x: auto; margin-bottom: 12pt; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; font-size: 10pt; }
    th, td { border: 1pt solid #ddd; padding: 8pt; text-align: left; }
    th { background-color: #667eea; color: white; font-weight: 600; }
    .footer { margin-top: 30pt; padding-top: 15pt; border-top: 1pt solid #e0e0e0; text-align: center; font-size: 9pt; color: #999; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
</head>
<body>
  ${htmlBody}
  <div class="footer"><p style="font-size:9pt;color:#999">Preview PDF - not signed</p></div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
          ],
          throwOnError : false
        });
      }
    });
  </script>
</body>
</html>`;

  const pdfWindow = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: false } });

  // Write HTML to a temporary file
  const tempHtmlPath = path.join(os.tmpdir(), `auditor-preview-${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    await pdfWindow.loadFile(tempHtmlPath);
    await new Promise(resolve => setTimeout(resolve, 400));
    const pdfBuffer = await pdfWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4', preferCSSPageSize: true });
    return pdfBuffer;
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempHtmlPath)) {
      try {
        fs.unlinkSync(tempHtmlPath);
      } catch (e) {
        console.error('Failed to cleanup temp file:', e);
      }
    }
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
}
