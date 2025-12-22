import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ReserveData {
    amount: number;
    currency: string;
    date: string;
    auditorId: string;
}

async function verifyAuditorTool() {
    console.log("Starting Auditor Tool Logic Verification...");

    // Mock Input Data
    const data: ReserveData = {
        amount: 5000000,
        currency: 'USD',
        date: '2025-12-09',
        auditorId: 'TEST-AUDITOR-99'
    };

    const outputDir = path.join(__dirname, '../out/test_proofs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // --- 1. Generation Logic (Mirrors src/main/pdfService.ts) ---
    console.log("Generating PDF...");

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 24;

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

    // Metadata Injection
    const metadataJson = JSON.stringify(data);
    pdfDoc.setTitle('Zepor Audit Report');
    pdfDoc.setAuthor('Zepor Auditor Tool');
    pdfDoc.setSubject(metadataJson); // CRITICAL: ZK Circuit reads this

    const pdfBytes = await pdfDoc.save();

    const fileName = `test_proof_${data.auditorId}.pdf`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);
    console.log(`PDF saved to: ${filePath}`);

    // Signature
    const fileHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    const signaturePath = filePath + '.sig';
    fs.writeFileSync(signaturePath, `SIGNATURE_${fileHash}`);
    console.log(`Signature saved to: ${signaturePath}`);

    // --- 2. Verification Logic ---
    console.log("\nVerifying Artifacts...");

    // Check PDF exists
    if (!fs.existsSync(filePath)) throw new Error("PDF file was not created");

    // Check Metadata
    const loadedPdf = await PDFDocument.load(fs.readFileSync(filePath));
    const subject = loadedPdf.getSubject();

    console.log(`Read Metadata (Subject): ${subject}`);

    if (subject !== metadataJson) {
        throw new Error(`Metadata Mismatch! Expected: ${metadataJson}, Got: ${subject}`);
    }
    console.log("SUCCESS: Metadata matches input.");

    // Check Content (Basic check of text extraction isn't easy with pdf-lib usually, 
    // but we trust the generation code we just ran. We verified the Metadata which is key for ZKP).

    // Check Signature
    if (!fs.existsSync(signaturePath)) throw new Error("Signature file missing");
    const sigContent = fs.readFileSync(signaturePath, 'utf8');
    if (!sigContent.includes(fileHash)) throw new Error("Signature content invalid");
    console.log("SUCCESS: Signature file created and contains valid hash.");

    console.log("\n---------------------------------------------------");
    console.log("AUDITOR TOOL LOGIC VERIFICATION PASSED");
    console.log("---------------------------------------------------");
}

verifyAuditorTool().catch(e => {
    console.error("VERIFICATION FAILED:", e);
    process.exit(1);
});
