import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface ReserveData {
    amount: number;
    currency: string;
    date: string;
    auditorId: string;
}

export async function generateProofPdf(data: ReserveData): Promise<{ filePath: string; fileHash: string }> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 24;

    // Rigid Template Layout
    page.drawText('Zepor Proof of Reserve Audit', {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0.53, 0.71),
    });

    const contentSize = 14;
    let y = height - 6 * fontSize;

    const lines = [
        `Auditor ID: ${data.auditorId}`,
        `Date: ${data.date}`,
        `Reserve Amount: ${data.amount.toLocaleString()} ${data.currency}`,
        `Statement:`,
        `We verify that the above assets are held in custody.`,
    ];

    lines.forEach((line) => {
        page.drawText(line, {
            x: 50,
            y,
            size: contentSize,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
        });
        y -= contentSize * 2;
    });

    // Inject Metadata (Critical Step)
    // We store the raw JSON in the Subject field for the ZK circuit to read easily
    const metadataJson = JSON.stringify(data);
    pdfDoc.setTitle('Zepor Audit Report');
    pdfDoc.setAuthor('Zepor Auditor Tool');
    pdfDoc.setSubject(metadataJson); // Storing plain JSON in Subject
    pdfDoc.setKeywords(['zepor', 'proof-of-reserve', 'rwa']);

    const pdfBytes = await pdfDoc.save();

    // Save to Documents/ZeporProofs
    const documentsPath = app.getPath('documents');
    const saveDir = path.join(documentsPath, 'ZeporProofs');
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    const fileName = `proof_${data.auditorId}_${Date.now()}.pdf`;
    const filePath = path.join(saveDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    // --- CRYPTO SIGNING ---
    // In a real app, this would use a private key from a secure enclave or HSM.
    // Here we simulate it with a generated key pair or mock key.
    const fileHash = require('crypto').createHash('sha256').update(pdfBytes).digest('hex');

    // Mock signing (appending signature file)
    const signaturePath = filePath + '.sig';
    const mockSignature = `SIGNATURE_FOR_${fileHash}_BY_${data.auditorId}`;
    fs.writeFileSync(signaturePath, mockSignature);

    // In production:
    // const sign = crypto.createSign('SHA256');
    // sign.update(pdfBytes);
    // const sig = sign.sign(privateKey, 'hex');

    return { filePath, fileHash };
}
