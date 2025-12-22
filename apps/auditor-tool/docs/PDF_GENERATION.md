# PDF Generation and Signing Implementation

## Overview

This document details the implementation of PDF generation and cryptographic signing in the Zepor Auditor Tool.

## PDF Generation Workflow

### 1. Markdown to HTML Conversion

The tool uses a lightweight Markdown-to-HTML converter implemented in `markdownPdfService.ts`:

```typescript
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}
```

**Note**: For production use, consider using a full Markdown parser like `marked` or `markdown-it`.

### 2. HTML Template

The generated HTML includes:
- Styled headers and content from Markdown
- Document metadata footer (signer ID, timestamp, algorithm)
- CSS styling for professional appearance

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; }
    h1 { color: #0088cc; border-bottom: 2px solid #0088cc; }
    /* ... additional styles ... */
  </style>
</head>
<body>
  <!-- Markdown content -->
  <hr>
  <p style="font-size: 12px; color: #666;">
    <strong>Signer ID:</strong> AUDITOR-001<br>
    <strong>Timestamp:</strong> 2025-12-09T09:34:23.453Z<br>
    <strong>Algorithm:</strong> RSA-SHA256
  </p>
</body>
</html>
```

### 3. Electron printToPDF

Uses Electron's built-in PDF printing capability:

```typescript
const pdfBuffer = await mainWindow.webContents.printToPDF({
  marginsType: 0,
  printBackground: true,
  pageSize: 'A4'
});
```

**Benefits**:
- Native PDF generation (no external dependencies)
- Consistent rendering across platforms
- Supports CSS styling and print media queries

## Cryptographic Signing Implementation

### Key Pair Generation

#### RSA-SHA256 (2048-bit)

```typescript
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
```

**Output Format**:
- Private Key: PKCS#8, PEM-encoded
- Public Key: SubjectPublicKeyInfo, PEM-encoded

#### ECDSA-P256 (secp256r1)

```typescript
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
```

**Curve**: NIST P-256 (secp256r1)

### Signing Process

```typescript
// 1. Calculate file hash
const fileHash = crypto.createHash('sha256')
  .update(pdfBuffer)
  .digest('hex');

// 2. Create signature
const signAlgorithm = algorithm === 'RSA-SHA256' ? 'RSA-SHA256' : 'sha256';
const sign = crypto.createSign(signAlgorithm);
sign.update(pdfBuffer);
const signature = sign.sign(privateKey, 'hex');
```

### Signature Verification (Client-side)

```typescript
const verify = crypto.createVerify(signAlgorithm);
verify.update(pdfBuffer);
const isValid = verify.verify(publicKey, signature, 'hex');
```

## Metadata Structure

Each generated PDF is accompanied by a `.meta.json` file:

```json
{
  "signerId": "AUDITOR-001",
  "timestamp": 1702134263453,
  "algorithm": "RSA-SHA256",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "fileHash": "a3c5d8f2e4b1...",
  "signature": "4f8a9b2c3d1e..."
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `signerId` | string | Unique identifier of the auditor |
| `timestamp` | number | Unix timestamp (milliseconds) of signing |
| `algorithm` | string | Signing algorithm used |
| `publicKey` | string | PEM-encoded public key |
| `fileHash` | string | SHA-256 hash of PDF file (hex) |
| `signature` | string | Digital signature (hex-encoded) |

## File Saving

PDFs are saved to the user's Documents folder:

```typescript
const documentsPath = app.getPath('documents');
const saveDir = path.join(documentsPath, 'ZeporProofs');

// Create directory if it doesn't exist
if (!fs.existsSync(saveDir)) {
  fs.mkdirSync(saveDir, { recursive: true });
}

const fileName = `proof_${signerId}_${timestamp}.pdf`;
const filePath = path.join(saveDir, fileName);

// Save PDF and metadata
fs.writeFileSync(filePath, pdfBuffer);
fs.writeFileSync(filePath + '.meta.json', JSON.stringify(metadata, null, 2));
```

## Error Handling

### Invalid Private Key

```typescript
try {
  const keyObject = crypto.createPrivateKey(privKey);
  pubKey = crypto.createPublicKey(keyObject).export({ 
    type: 'spki', 
    format: 'pem' 
  }) as string;
} catch (e) {
  throw new Error('Invalid private key format');
}
```

### Window Unavailable

```typescript
const mainWindow = BrowserWindow.getAllWindows()[0];
if (!mainWindow) {
  throw new Error('No window available for PDF generation');
}
```

## Performance Considerations

- **PDF Generation**: ~500ms for typical document
- **Key Generation**: 
  - RSA-2048: ~200ms
  - ECDSA-P256: ~50ms
- **Signing**: 
  - RSA-SHA256: ~10ms
  - ECDSA-P256: ~5ms

## Security Best Practices

1. **Private Key Storage**: Never store unencrypted private keys in the application
2. **Key Validation**: Always validate imported keys before use
3. **Timestamp Validation**: Verify timestamp is recent (e.g., within 24 hours)
4. **Hash Verification**: Always verify file hash matches before accepting signature
5. **Algorithm Restrictions**: Only allow approved algorithms (RSA-SHA256, ECDSA-P256)

## Testing

Verification script location: `scripts/verify_enhancements.ts`

Runs automated tests for:
- RSA-SHA256 signing and verification
- ECDSA-P256 signing and verification
- Metadata structure validation
- Key pair generation

Run with: `npx tsx scripts/verify_enhancements.ts`
