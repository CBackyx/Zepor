# Zepor Auditor Tool - Architecture Overview

## Introduction

The Zepor Auditor Tool is a cross-platform desktop application built with Electron that enables auditors to create cryptographically signed Proof of Reserve documents. The tool provides a flexible Markdown editor for content creation and supports multiple signing algorithms.

## Technology Stack

- **Framework**: Electron (v39.2.6)
- **Frontend**: React (v19.2.1) + TypeScript
- **Build Tool**: electron-vite (v5.0.0)
- **UI Components**: react-simplemde-editor (Markdown editor)
- **Cryptography**: Node.js crypto module
- **PDF Generation**: Electron's `printToPDF` API

## Application Architecture

```
┌─────────────────────────────────────────────────┐
│           Main Process (Node.js)                │
│  - Window Management                            │
│  - IPC Handlers                                 │
│  - PDF Generation (markdownPdfService.ts)       │
│  - Cryptographic Signing                        │
└────────────┬────────────────────────────────────┘
             │ IPC Communication
             │
┌────────────▼────────────────────────────────────┐
│         Renderer Process (React)                │
│  - Markdown Editor (SimpleMDE)                  │
│  - Signing Configuration Form                   │
│  - User Interface Components                    │
└─────────────────────────────────────────────────┘
```

## Core Components

### 1. Main Process (`src/main/`)

**index.ts**
- Creates and manages the Electron browser window
- Registers IPC handlers for communication with renderer
- Window size: 1200x900 (resizable)

**markdownPdfService.ts**
- Handles PDF generation from Markdown content
- Implements cryptographic signing (RSA-SHA256, ECDSA-P256)
- Manages key pair generation and validation
- Saves metadata alongside PDFs

### 2. Renderer Process (`src/renderer/`)

**App.tsx**
- Main React application component
- Markdown editor integration (SimpleMDE)
- Signing configuration form
- Status feedback and error handling

### 3. Preload Script (`src/preload/`)

**index.ts**
- Exposes secure IPC API to renderer process
- `generateProofFromMarkdown(payload)` - Main API method

## Data Flow

1. **User Input**
   - Auditor writes/edits Markdown content
   - Configures signer ID, algorithm, and optionally private key

2. **PDF Generation Request**
   - Renderer sends payload via IPC to main process
   - Payload includes: markdown, signerId, algorithm, privateKey

3. **Processing (Main Process)**
   - Converts Markdown to HTML
   - Uses `printToPDF` to generate PDF
   - Calculates file hash (SHA-256)
   - Signs hash using specified algorithm
   - Saves PDF and metadata JSON

4. **Response**
   - Returns file path and hash to renderer
   - Updates UI with success/error status

## Security Model

### Key Management
- **User-Provided Keys**: Auditors can import PEM-formatted private keys
- **Ephemeral Keys**: Auto-generated if no key provided (not recommended for production)
- **Public Key Extraction**: Derived from private key for metadata

### Signing Algorithms
- **RSA-SHA256**: 2048-bit modulus, PKCS#8 format
- **ECDSA-P256**: secp256r1 curve (prime256v1)

### Metadata Storage
Separate `.meta.json` file contains:
```json
{
  "signerId": "AUDITOR-001",
  "timestamp": 1702134263453,
  "algorithm": "RSA-SHA256",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "fileHash": "abc123...",
  "signature": "def456..."
}
```

## Build Process

1. **Development**: `npm run dev` - Hot reload with electron-vite
2. **Production Build**: `npm run build` - Compiles to `out/` directory
3. **Platform Packaging**:
   - Windows: `npm run build:win` (creates .exe installer)
   - macOS: `npm run build:mac` (creates .dmg)
   - Linux: `npm run build:linux` (creates .AppImage/.deb)

## File Structure

```
apps/auditor-tool/
├── src/
│   ├── main/              # Main process (Node.js)
│   │   ├── index.ts
│   │   └── markdownPdfService.ts
│   ├── preload/           # Preload scripts
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/          # Renderer process (React)
│       └── src/
│           ├── App.tsx
│           └── main.tsx
├── docs/                  # Documentation
├── scripts/               # Verification scripts
├── build/                 # Build resources (icons)
├── electron-builder.yml   # Packaging configuration
└── package.json
```

## Future Enhancements

- Hardware Security Module (HSM) integration
- Multi-signature support
- Template library
- PDF preview before signing
- Batch processing
- Cloud key management integration
