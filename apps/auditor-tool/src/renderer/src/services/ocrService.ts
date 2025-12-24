import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
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
        onProgress(0, 'Initializing Tesseract...');

        let worker;
        try {
            // Support English and Simplified Chinese only to prevent confusion and improve speed
            worker = await createWorker('eng+chi_sim');
        } catch (e) {
            console.error('Tesseract Init Error:', e);
            throw new Error(`Failed to initialize Tesseract: ${String(e)}`);
        }

        for (let i = 1; i <= numPages; i++) {
            onProgress(i / numPages, `Processing page ${i} of ${numPages}...`);

            const page = await pdf.getPage(i);
            // Lower scale slightly for speed if needed, but 2.0 is good for accuracy.
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error('Could not create canvas context');

            await page.render({
                canvasContext: context,
                viewport: viewport
            } as any).promise;

            const dataUrl = canvas.toDataURL('image/png');
            const ret = await worker.recognize(dataUrl);

            // Access words to handle spacing manually
            let pageText = '';

            // Use 'lines' for better structure structure preservation
            const lines = (ret.data as any).lines;
            if (lines && lines.length > 0) {
                pageText = lines.map(line => {
                    // Filter out empty or whitespace-only words (separators)
                    // Also TRIM words to ensure no internal/boundary spaces confuse us
                    const lineWords = line.words ? line.words
                        .map(w => ({ ...w, text: w.text ? w.text.trim() : '' }))
                        .filter(w => w.text.length > 0)
                        : [];

                    if (lineWords.length === 0) return '';

                    let lineStr = lineWords[0].text;

                    for (let k = 1; k < lineWords.length; k++) {
                        const prev = lineWords[k - 1];
                        const curr = lineWords[k];

                        // Extended CJK range including punctuation and full-width forms
                        const isCJK = (str: string) => /[\u2000-\u206F\u3000-\u30FF\u4E00-\u9FBF\uFF00-\uFFEF]/.test(str);

                        const prevChar = prev.text.slice(-1); // Last char of prev
                        const currChar = curr.text.charAt(0); // First char of curr

                        const prevIsCJK = isCJK(prevChar);
                        const currIsCJK = isCJK(currChar);

                        if (prevIsCJK || currIsCJK) {
                            // No space between CJK characters
                            lineStr += curr.text;
                        } else {
                            // Space between non-CJK (English/Numbers)
                            lineStr += ' ' + curr.text;
                        }
                    }
                    return lineStr;
                }).join('\n');

                // FINAL CLEANUP: Remove ANY spaces between CJK characters.
                // This covers cases where Tesseract itself returned a "word" that contained spaces (e.g. "易 方 达")
                // or where our logic above missed a nuanced boundary.
                // Regex matches: [CJK] [spaces] (?=[CJK]) -> [CJK]
                // We use lookahead (?=...) so that the second CJK char isn't consumed, allowing it to be the start of the next match.
                pageText = pageText.replace(/([\u2000-\u206F\u3000-\u30FF\u4E00-\u9FBF\uFF00-\uFFEF])\s+(?=[\u2000-\u206F\u3000-\u30FF\u4E00-\u9FBF\uFF00-\uFFEF])/g, '$1');

            } else {
                // Determine if we need to clean raw text too
                pageText = ret.data.text.replace(/([\u2000-\u206F\u3000-\u30FF\u4E00-\u9FBF\uFF00-\uFFEF])\s+(?=[\u2000-\u206F\u3000-\u30FF\u4E00-\u9FBF\uFF00-\uFFEF])/g, '$1');
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
