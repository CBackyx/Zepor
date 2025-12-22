import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
// In a Vite environment, we often need to point to the worker file explicitly.
// We'll trust pdfjs-dist's webpack/vite compatibility or user might need to adjust vite config.
// For now, we try to use the build included in the package.
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPdf(
    file: File,
    onProgress: (progress: number, status: string) => void
): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: window.location.origin + '/cmaps/',
            cMapPacked: true,
        });
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        let fullText = '';

        // Initialize Tesseract worker
        // Initialize Tesseract worker
        onProgress(0, 'Initializing Tesseract (downloading language data if needed)...');

        let worker;
        try {
            // v5: createWorker(langs, oem, options)
            // Support English, Simplified Chinese, and Traditional Chinese
            worker = await createWorker('eng+chi_sim+chi_tra');
        } catch (e) {
            console.error('Tesseract Init Error:', e);
            throw new Error(`Failed to initialize Tesseract: ${String(e)}`);
        }

        for (let i = 1; i <= numPages; i++) {
            onProgress(i / numPages, `Processing page ${i} of ${numPages}...`);

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

            // Create an offscreen canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error('Could not create canvas context');

            await page.render({
                canvasContext: context,
                viewport: viewport
            } as any).promise;

            // Convert canvas to image data url or blob for Tesseract
            const dataUrl = canvas.toDataURL('image/png');

            const ret = await worker.recognize(dataUrl);

            // Basic Table Detection Heuristic
            const lines = (ret.data as any).lines;
            let pageText = '';

            if (lines && lines.length > 0) {
                // Process each line to check for column gaps
                // Scale 2.0 constants
                const COLUMN_GAP_THRESHOLD = 40;
                const WORD_SPACE_THRESHOLD = 10;

                for (const line of lines) {
                    const words = line.words;
                    if (!words || words.length === 0) continue;

                    let lineStr = words[0].text;
                    let hasColumnGap = false;

                    for (let j = 1; j < words.length; j++) {
                        const prev = words[j - 1];
                        const curr = words[j];

                        const gap = curr.bbox.x0 - prev.bbox.x1;

                        if (gap > COLUMN_GAP_THRESHOLD) {
                            // Table Column
                            lineStr += ' | ' + curr.text;
                            hasColumnGap = true;
                        } else if (gap > WORD_SPACE_THRESHOLD) {
                            // Normal Space (English words)
                            lineStr += ' ' + curr.text;
                        } else {
                            // No Space (CJK characters or joined text)
                            lineStr += curr.text;
                        }
                    }

                    if (hasColumnGap) {
                        pageText += `| ${lineStr} |\n`;
                    } else {
                        pageText += `${lineStr}\n`;
                    }
                }
            } else {
                // Fallback if no line data
                pageText = ret.data.text;
            }

            fullText += `\n\n## Page ${i}\n\n${pageText}`;
        }

        await worker.terminate();
        return fullText;

    } catch (error) {
        console.error('OCR Error:', error);
        const msg = (error as Error).message || String(error);
        throw new Error(`Technical Detail: ${msg}`);
    }
}
