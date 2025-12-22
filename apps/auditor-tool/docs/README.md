# Zepor Auditor Tool Documentation

## Overview

The Zepor Auditor Tool is a cross-platform desktop application for creating cryptographically signed Proof of Reserve audit reports. It provides a flexible Markdown editor and supports multiple signing algorithms.

## Documentation Index

### For Users
- **[User Guide](USER_GUIDE.md)** - Installation, usage instructions, and best practices
  - Installation for Windows/macOS/Linux
  - Step-by-step guide to creating signed PDFs
  - Understanding metadata files
  - Troubleshooting common issues

### For Developers
- **[Architecture Overview](ARCHITECTURE.md)** - System design and component overview
  - Technology stack
  - Application architecture
  - Core components
  - Security model
  - Build process

- **[PDF Generation & Signing](PDF_GENERATION.md)** - Implementation details
  - PDF generation workflow
  - Cryptographic signing implementation
  - Metadata structure
  - Error handling
  - Performance considerations

- **[API Reference](API_REFERENCE.md)** - Complete API documentation
  - IPC API methods
  - Type definitions
  - Cryptographic functions
  - Build configuration

## Quick Start

### Users
1. Download and extract the application
2. Run `npm install`
3. Execute `npm run dev` to launch
4. Write your audit report in Markdown
5. Configure signing options
6. Click "Generate & Sign PDF"

### Developers
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Build for production: `npm run build`
5. Package for platform: `npm run build:win|mac|linux`

## Key Features

✅ **Flexible Content Creation** - Markdown editor with rich formatting  
✅ **Multiple Signing Algorithms** - RSA-SHA256 and ECDSA-P256 support  
✅ **Cross-Platform** - Windows, macOS, and Linux  
✅ **Secure Key Management** - Import your own keys or use ephemeral keys  
✅ **Complete Metadata** - Timestamp, signer ID, and public key included  
✅ **Professional PDFs** - Clean, styled output with embedded signatures  

## System Requirements

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Operating System**: 
  - Windows 10/11
  - macOS 10.15+
  - Linux (Ubuntu 20.04+, Fedora 35+)
- **Disk Space**: ~500MB for installation
- **RAM**: Minimum 4GB

## Project Structure

```
apps/auditor-tool/
├── docs/                      # Documentation (you are here)
│   ├── README.md             # This file
│   ├── USER_GUIDE.md         # User documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── PDF_GENERATION.md     # Technical implementation
│   └── API_REFERENCE.md      # API documentation
├── src/
│   ├── main/                 # Electron main process
│   ├── preload/              # Preload scripts
│   └── renderer/             # React frontend
├── scripts/                  # Verification scripts
├── build/                    # Build resources
└── package.json
```

## Technology Stack

- **Framework**: Electron 39.2.6
- **UI**: React 19.2.1 + TypeScript 5.9.3
- **Build**: electron-vite 5.0.0
- **Editor**: SimpleMDE (EasyMDE)
- **Crypto**: Node.js native crypto module

## Security Considerations

⚠️ **Private Keys**: Never commit or share private keys  
⚠️ **Ephemeral Keys**: Don't use for production (keys are lost on close)  
⚠️ **Key Storage**: Use encrypted vaults or HSMs for production  
⚠️ **Verification**: Always verify signatures before trusting documents  

## Support

For technical issues:
1. Check the [User Guide](USER_GUIDE.md) troubleshooting section
2. Review [Architecture](ARCHITECTURE.md) for system understanding
3. Consult [API Reference](API_REFERENCE.md) for integration

## License

Part of the Zepor platform ecosystem.

## Version History

- **v1.1.0** (Current) - Enhanced UI with scrolling and improved layout
- **v1.0.0** - Initial release with Markdown support and flexible signing
