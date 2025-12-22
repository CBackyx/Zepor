import { BrowserWindow } from 'electron';
import { marked } from 'marked';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface MarkdownPayload {
  markdown: string;
  signerId: string;
  algorithm: 'RSA-SHA256' | 'ECDSA-P256';
  privateKey: string;
  saveLocation?: string;
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

// Generate default key pairs for different algorithms
function generateDefaultKeyPair(algorithm: string): KeyPair {
  if (algorithm === 'RSA-SHA256') {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  } else {
    // ECDSA
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }
}

export async function generateProofFromMarkdown(
  payload: MarkdownPayload,
  mainWindow: BrowserWindow
): Promise<{ filePath: string; fileHash: string }> {
  const { markdown, signerId, algorithm, privateKey, saveLocation } = payload;

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
  const htmlBody = await marked(markdown);
  const timestamp = new Date().toISOString();

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
      font-family: 'Georgia', 'Times New Roman', serif;
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
      text-align: justify;
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
      <span class="metadata-value" style="font-family: monospace; font-size: 8pt;">Will be calculated after generation</span>
    </div>
  </div>
  
  <div class="footer">
    <p class="footer-logo">⚡ Signed Audit PDF powered by Zepor.</p>
    <p style="margin-top: 4pt; font-size: 8pt;">Cryptographically signed document • Verify authenticity using the metadata file</p>
  </div>
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
      nodeIntegration: false
    }
  });

  // Load the HTML content
  await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

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
    // Ensure .pdf extension
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

  // Save PDF
  fs.writeFileSync(filePath, pdfBuffer);

  // Calculate hash
  const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Sign the hash
  const signAlgorithm = algorithm === 'RSA-SHA256' ? 'RSA-SHA256' : 'sha256';
  const sign = crypto.createSign(signAlgorithm);
  sign.update(pdfBuffer);
  const signature = sign.sign(privKey, 'hex');

  // Save metadata and signature
  const metadataPath = filePath + '.meta.json';
  const metadata = {
    signerId,
    timestamp: new Date().toISOString(),
    timestampUnix: Date.now(),
    algorithm,
    publicKey: pubKey,
    fileHash,
    signature,
    version: '1.1.0',
    generator: 'Zepor Auditor Tool'
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return { filePath, fileHash };
}
