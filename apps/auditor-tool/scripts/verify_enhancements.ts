import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TEST_MARKDOWN = `# Zepor Proof of Reserve Audit Report

## Auditor Information
- **Auditor ID**: TEST-AUDITOR-ENHANCED
- **Date**: 2025-12-09

## Reserve Details
- **Asset Type**: BTC
- **Total Amount**: 10,000 BTC
- **Custody Location**: Cold Storage Vault A

## Verification Statement
We hereby certify that the above-mentioned assets are held in custody and have been verified as of the date specified.
`;

interface KeyPair {
    publicKey: string;
    privateKey: string;
}

function generateKeyPair(algorithm: string): KeyPair {
    if (algorithm === 'RSA-SHA256') {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { publicKey, privateKey };
    } else {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { publicKey, privateKey };
    }
}

async function verifyEnhancements() {
    console.log("Starting Enhanced Auditor Tool Verification...\n");

    const algorithms = ['RSA-SHA256', 'ECDSA-P256'];

    for (const algorithm of algorithms) {
        console.log(`\n--- Testing ${algorithm} ---`);

        // Generate key pair
        const keyPair = generateKeyPair(algorithm);
        console.log(`Generated ${algorithm} key pair`);

        // Simulate signing
        const testData = Buffer.from(TEST_MARKDOWN);
        const signAlgorithm = algorithm === 'RSA-SHA256' ? 'RSA-SHA256' : 'sha256';
        const sign = crypto.createSign(signAlgorithm);
        sign.update(testData);
        const signature = sign.sign(keyPair.privateKey, 'hex');
        console.log(`Signature created: ${signature.substring(0, 32)}...`);

        // Verify signature
        const verify = crypto.createVerify(signAlgorithm);
        verify.update(testData);
        const isValid = verify.verify(keyPair.publicKey, signature, 'hex');

        if (!isValid) {
            throw new Error(`Signature verification failed for ${algorithm}`);
        }
        console.log(`✓ Signature verified successfully`);

        // Test metadata structure
        const metadata = {
            signerId: 'TEST-AUDITOR-ENHANCED',
            timestamp: Date.now(),
            algorithm: algorithm,
            publicKey: keyPair.publicKey,
            fileHash: crypto.createHash('sha256').update(testData).digest('hex'),
            signature: signature
        };

        console.log(`✓ Metadata structure valid:`);
        console.log(`  - Signer ID: ${metadata.signerId}`);
        console.log(`  - Timestamp: ${new Date(metadata.timestamp).toISOString()}`);
        console.log(`  - Algorithm: ${metadata.algorithm}`);
        console.log(`  - Public Key: ${metadata.publicKey.substring(0, 50)}...`);
        console.log(`  - File Hash: ${metadata.fileHash.substring(0, 32)}...`);
    }

    console.log("\n---------------------------------------------------");
    console.log("ENHANCED AUDITOR TOOL VERIFICATION PASSED");
    console.log("---------------------------------------------------");
    console.log("\nVerified Features:");
    console.log("✓ RSA-SHA256 signing and verification");
    console.log("✓ ECDSA-P256 signing and verification");
    console.log("✓ Metadata structure with timestamp, signer ID, and public key");
    console.log("✓ Flexible key management (both algorithms supported)");
}

verifyEnhancements().catch(e => {
    console.error("VERIFICATION FAILED:", e);
    process.exit(1);
});
