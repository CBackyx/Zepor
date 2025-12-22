# Zepor Auditor Tool - User Guide

## Installation

### Windows

1. Download `auditor-tool-fixed.tar.gz` from the server
2. Extract the archive
3. Open PowerShell/Command Prompt and navigate to the folder
4. Install dependencies:
   ```powershell
   npm install
   ```
5. Run in development mode:
   ```powershell
   npm run dev
   ```
   OR build an installer:
   ```powershell
   npm run build:win
   ```
6. Install the generated `.exe` file from the `dist` folder

### macOS

1. Extract the archive
2. Open Terminal and navigate to the folder
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run or build:
   ```bash
   npm run dev          # Development mode
   npm run build:mac    # Create .dmg installer
   ```

### Linux

1. Extract the archive
2. Open terminal and navigate to the folder
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run or build:
   ```bash
   npm run dev           # Development mode
   npm run build:linux   # Create .AppImage
   ```

## Using the Auditor Tool

### Step 1: Write Your Audit Report

1. Launch the Zepor Auditor Tool
2. You'll see a Markdown editor with a default template
3. Edit the template or write your custom report

**Markdown Basics**:
- `# Heading 1` - Large heading
- `## Heading 2` - Section heading
- `**bold text**` - Bold text
- `*italic text*` - Italic text
- `- List item` - Bullet list

**Example Report**:
```markdown
# Zepor Proof of Reserve Audit Report

## Auditor Information
- **Auditor ID**: ACME-AUDIT-2025
- **Date**: 2025-12-09
- **Certification**: ISO 27001

## Reserve Details
- **Asset Type**: Bitcoin (BTC)
- **Total Amount**: 1,234.5678 BTC
- **Custody Location**: Cold Storage Vault A, Singapore
- **Wallet Addresses**: 
  - bc1q... (500 BTC)
  - bc1q... (734.5678 BTC)

## Verification Statement
We hereby certify that the above-mentioned assets are held in custody 
as of 2025-12-09T12:00:00Z and have been verified through on-chain 
transaction analysis and physical vault inspection.

## Methodology
1. On-chain verification of all wallet addresses
2. Physical inspection of cold storage hardware
3. Verification of multi-signature controls
4. Review of custody procedures

---
*This document is cryptographically signed by ACME Auditors Ltd.*
```

### Step 2: Configure Signing

#### Signer ID
Enter a unique identifier for yourself or your organization:
- Examples: `ACME-AUDIT`, `JOHN-DOE-CPA`, `DELOITTE-CRYPTO-2025`
- Should be consistent across all your audit reports

#### Signing Algorithm
Choose between two algorithms:

**RSA-SHA256** (Recommended for most use cases)
- Industry standard
- 2048-bit key size
- Widely supported for verification

**ECDSA-P256** (Recommended for blockchain integration)
- Smaller signatures
- Faster signing
- Compatible with Ethereum and other blockchains

#### Private Key (Optional)

**Option 1: Use Your Own Key**
1. Paste your PEM-formatted private key in the text area
2. Format should be:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
   -----END PRIVATE KEY-----
   ```

**Option 2: Let the Tool Generate a Key**
1. Leave the private key field empty
2. The tool will generate an ephemeral key pair
3. ⚠️ **Warning**: The private key will be lost after closing the app
4. Only use this for testing or non-critical documents

### Step 3: Generate and Sign

1. Click the **"Generate & Sign PDF"** button
2. Wait for processing (typically 1-2 seconds)
3. You'll see a success message with the file location

### Step 4: Locate Your Files

Generated files are saved to:
- **Windows**: `C:\Users\YourName\Documents\ZeporProofs\`
- **macOS**: `/Users/YourName/Documents/ZeporProofs/`
- **Linux**: `/home/yourname/Documents/ZeporProofs/`

**Files created**:
1. `proof_AUDITOR-ID_1234567890.pdf` - The signed PDF document
2. `proof_AUDITOR-ID_1234567890.pdf.meta.json` - Metadata with signature

## Understanding the Metadata File

The `.meta.json` file contains crucial verification data:

```json
{
  "signerId": "ACME-AUDIT-2025",
  "timestamp": 1702134263453,
  "algorithm": "RSA-SHA256",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "fileHash": "a3c5d8f2e4b1c9f3a5d7e2b8c4f1a6d9e3b7c5f2a8d4e1b9c6f3a7d2e5b8c4f1",
  "signature": "4f8a9b2c3d1e5f7a9b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a..."
}
```

### Fields Explained

- **signerId**: Who signed the document
- **timestamp**: When it was signed (Unix timestamp in milliseconds)
- **algorithm**: Which signing algorithm was used
- **publicKey**: The public key for verification (share this with verifiers)
- **fileHash**: SHA-256 hash of the PDF file
- **signature**: Digital signature that proves authenticity

### Sharing with Verifiers

When sharing your proof:
1. Send both the PDF and the `.meta.json` file
2. Recipients can verify:
   - Who signed it (from `signerId`)
   - When it was signed (from `timestamp`)
   - That the content hasn't been modified (by verifying `signature` against `fileHash`)

## Best Practices

### Security

1. **Private Key Management**:
   - Use a hardware security module (HSM) for production
   - Never email or share your private key
   - Store keys in encrypted vaults (e.g., 1Password, LastPass)

2. **Signer ID**:
   - Use consistent, traceable identifiers
   - Include your organization name
   - Consider adding year/version for key rotation

3. **Document Security**:
   - Review content carefully before signing
   - Keep offline backups of signed documents
   - Maintain an audit log of all generated proofs

### Workflow Tips

1. **Create Templates**: Save commonly used Markdown templates
2. **Batch Processing**: Sign multiple documents in one session
3. **Version Control**: Include version numbers in your reports
4. **Timestamping**: The tool automatically adds timestamps, but mention key dates in content

## Troubleshooting

### "Invalid private key format" error
- Ensure key is in PEM format
- Check for extra spaces or line breaks
- Verify key headers: `-----BEGIN PRIVATE KEY-----`

### Button not visible
- Try scrolling down
- Resize the window (it's resizable)
- Restart the application

### Markdown editor not showing
- Check that you have a stable internet connection (CDN for fonts)
- Try clearing cache and restarting
- Update to the latest version

### PDF not generating
- Check file permissions in Documents folder
- Ensure disk space is available
- Review console for error messages (Help > Toggle Developer Tools)

## Keyboard Shortcuts

### Editor
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + L` - Insert link
- `F11` - Fullscreen editor

### Application
- `Ctrl/Cmd + R` - Refresh (development mode)
- `Ctrl/Cmd + Shift + I` - Open Developer Tools
- `Ctrl/Cmd + W` - Close window

## Support

For issues or questions:
1. Check the documentation in the `docs/` folder
2. Review example scripts in `scripts/` folder
3. Contact your Zepor platform administrator
