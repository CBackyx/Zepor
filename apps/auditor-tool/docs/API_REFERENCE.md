# API Reference

## IPC API

The Auditor Tool exposes a single main API method through Electron's IPC mechanism.

### `generateProofFromMarkdown(payload)`

Generates a signed PDF from Markdown content.

#### Parameters

**payload**: `MarkdownPayload` object

```typescript
interface MarkdownPayload {
  markdown: string;        // Markdown content to convert to PDF
  signerId: string;        // Unique identifier for the signer
  algorithm: 'RSA-SHA256' | 'ECDSA-P256';  // Signing algorithm
  privateKey: string;      // PEM-formatted private key or 'DEFAULT_KEY'
}
```

#### Returns

`Promise<GenerationResult>`

```typescript
interface GenerationResult {
  filePath: string;   // Absolute path to the generated PDF
  fileHash: string;   // SHA-256 hash of the PDF (hex-encoded)
}
```

#### Example Usage (Renderer Process)

```typescript
const payload = {
  markdown: '# My Audit Report\n\nContent goes here...',
  signerId: 'AUDITOR-001',
  algorithm: 'RSA-SHA256',
  privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
};

try {
  const result = await window.api.generateProofFromMarkdown(payload);
  console.log('PDF saved to:', result.filePath);
  console.log('File hash:', result.fileHash);
} catch (error) {
  console.error('Generation failed:', error);
}
```

#### Error Handling

The method throws errors in the following cases:

```typescript
// Invalid private key format
throw new Error('Invalid private key format');

// No window available for PDF generation
throw new Error('No window available');

// File system errors (permissions, disk full, etc.)
throw new Error('Failed to save PDF: ...');
```

## Main Process API

### Key Generation Functions

#### `generateDefaultKeyPair(algorithm: string): KeyPair`

Generates a new cryptographic key pair.

**Parameters**:
- `algorithm`: `'RSA-SHA256'` or `'ECDSA-P256'`

**Returns**:
```typescript
interface KeyPair {
  publicKey: string;   // PEM-encoded public key
  privateKey: string;  // PEM-encoded private key
}
```

**Example**:
```typescript
const rsaKeys = generateDefaultKeyPair('RSA-SHA256');
const ecKeys = generateDefaultKeyPair('ECDSA-P256');
```

### PDF Generation Functions

#### `convertMarkdownToHTML(markdown: string): string`

Converts Markdown to HTML.

**Parameters**:
- `markdown`: Markdown-formatted text

**Returns**: HTML string with embedded styles

**Supported Markdown Features**:
- Headers (`#`, `##`, `###`)
- Bold (`**text**`)
- Italic (`*text*`)
- Unordered lists (`- item`)
- Line breaks

**Example**:
```typescript
const html = convertMarkdownToHTML('# Title\n\n**Bold text**');
// Returns: '<h1>Title</h1><br><br><strong>Bold text</strong>'
```

## Type Definitions

### SigningConfig

```typescript
interface SigningConfig {
  signerId: string;
  algorithm: 'RSA-SHA256' | 'ECDSA-P256';
  privateKey: string;
}
```

### Metadata

```typescript
interface Metadata {
  signerId: string;
  timestamp: number;      // Unix timestamp in milliseconds
  algorithm: string;
  publicKey: string;      // PEM-encoded
  fileHash: string;       // SHA-256 in hex
  signature: string;      // Hex-encoded signature
}
```

## Cryptographic Functions

### Hash Calculation

```typescript
import crypto from 'crypto';

const fileHash = crypto.createHash('sha256')
  .update(pdfBuffer)
  .digest('hex');
```

### Signature Creation

**RSA-SHA256**:
```typescript
const sign = crypto.createSign('RSA-SHA256');
sign.update(pdfBuffer);
const signature = sign.sign(privateKey, 'hex');
```

**ECDSA-P256**:
```typescript
const sign = crypto.createSign('sha256');
sign.update(pdfBuffer);
const signature = sign.sign(privateKey, 'hex');
```

### Signature Verification

```typescript
const verify = crypto.createVerify(algorithm);
verify.update(pdfBuffer);
const isValid = verify.verify(publicKey, signature, 'hex');
```

## File System API

### Save Locations

```typescript
import { app } from 'electron';
import path from 'path';

const documentsPath = app.getPath('documents');
const saveDir = path.join(documentsPath, 'ZeporProofs');
```

### File Naming Convention

```typescript
const timestamp = Date.now();
const fileName = `proof_${signerId}_${timestamp}.pdf`;
const metadataFileName = `${fileName}.meta.json`;
```

## Constants

```typescript
// Supported algorithms
const ALGORITHMS = ['RSA-SHA256', 'ECDSA-P256'] as const;

// RSA key size
const RSA_MODULUS_LENGTH = 2048;

// ECDSA curve
const EC_CURVE = 'prime256v1';  // Also known as secp256r1 or NIST P-256

// PDF page size
const PDF_PAGE_SIZE = 'A4';

// Save directory name
const SAVE_FOLDER = 'ZeporProofs';
```

## React Hooks Usage

### useState for Form Management

```typescript
const [config, setConfig] = useState<SigningConfig>({
  signerId: 'AUDITOR-001',
  algorithm: 'RSA-SHA256',
  privateKey: ''
});

// Update signer ID
setConfig({ ...config, signerId: 'NEW-ID' });
```

### useState for Status Tracking

```typescript
const [status, setStatus] = useState<string>('');
const [isProcessing, setIsProcessing] = useState(false);

// Show processing state
setIsProcessing(true);
setStatus('Generating PDF...');

// Show success
setIsProcessing(false);
setStatus('Success! PDF saved to: /path/to/file.pdf');
```

## SimpleMDE Configuration

```typescript
<SimpleMDE 
  value={markdown} 
  onChange={setMarkdown}
  options={{
    spellChecker: false,
    placeholder: 'Write your audit report here...',
    minHeight: '300px',
    status: false,
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'unordered-list', 'ordered-list', '|',
      'link', 'preview', 'side-by-side', 'fullscreen'
    ]
  }}
/>
```

## Build Configuration

### electron-vite.config.ts

```typescript
export default {
  main: {
    // Main process configuration
  },
  preload: {
    // Preload script configuration
  },
  renderer: {
    // Renderer process configuration
  }
}
```

### electron-builder.yml

```yaml
appId: com.zepor.auditor-tool
productName: Zepor Auditor Tool
directories:
  output: dist
files:
  - out/**/*
  - package.json
```

## Environment Variables

```bash
# Development
ELECTRON_RENDERER_URL=http://localhost:5173

# Production
NODE_ENV=production
```
