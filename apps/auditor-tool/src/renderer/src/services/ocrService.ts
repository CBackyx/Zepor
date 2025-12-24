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
            // Support English, Simplified Chinese, and Traditional Chinese
            worker = await createWorker('eng+chi_sim+chi_tra');
        } catch (e) {
            console.error('Tesseract Init Error:', e);
            throw new Error(`Failed to initialize Tesseract: ${String(e)}`);
        }

        for (let i = 1; i <= numPages; i++) {
            onProgress(i / numPages, `Processing page ${i} of ${numPages}...`);

            const page = await pdf.getPage(i);
            // Lower scale slightly for speed if needed, but 2.0 is good for accuracy.
            // Let's keep 2.0 as requested for quality "support".
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
            const words = (ret.data as any).words;
            let pageText = '';

            if (words && words.length > 0) {
                // Heuristic for spacing:
                // If Prev is CJK or Next is CJK -> No Space
                // If Prev is English/Num AND Next is English/Num -> Space

                for (let j = 0; j < words.length; j++) {
                    const word = words[j];
                    const text = word.text;

                    if (j === 0) {
                        pageText += text;
                        continue;
                    }

                    const prevWord = words[j - 1];
                    const prevText = prevWord.text;

                    // Simple CJK check (Ranges for common CJK)
                    // This is a naive check but covers most common cases
                    const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

                    const prevIsCJK = isCJK(prevText);
                    const currIsCJK = isCJK(text);

                    // Check for new line based on bbox or Tesseract's line info? 
                    // Tesseract "words" array flattens everything usually, or we can use "lines".
                    // Using "lines" is safer for layout preservation.
                }

                // Let's switch to using 'lines' for structure, then process words within line
                const lines = (ret.data as any).lines;
                if (lines && lines.length > 0) {
                    pageText = lines.map(line => {
                        const lineWords = line.words;
                        if (!lineWords || lineWords.length === 0) return '';

                        let lineStr = lineWords[0].text;

                        for (let k = 1; k < lineWords.length; k++) {
                            const prev = lineWords[k - 1];
                            const curr = lineWords[k];

                            const isCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);
                            // Simple regex for CJK
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
                } else {
                    pageText = ret.data.text;
                }

            } else {
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
