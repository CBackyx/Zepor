import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTextFromPdf } from './ocrService';

// --- Mocks ---

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
    return {
        GlobalWorkerOptions: {
            workerSrc: ''
        },
        getDocument: vi.fn()
    };
});

// Mock tesseract.js
vi.mock('tesseract.js', () => {
    return {
        createWorker: vi.fn()
    };
});

// Mock console.error to keep test output clean during expected errors
vi.spyOn(console, 'error').mockImplementation(() => { });

import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

describe('ocrService - extractTextFromPdf', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should extract text successfully from a PDF', async () => {
        // Setup Mock Helper Objects
        const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        // Mock PDF Document Loading
        const mockPage = {
            getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
            render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        };

        const mockPdfDocument = {
            numPages: 1,
            getPage: vi.fn().mockResolvedValue(mockPage),
        };

        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve(mockPdfDocument)
        });

        // Mock Tesseract Worker
        const mockWorker = {
            recognize: vi.fn().mockResolvedValue({
                data: { text: 'Extracted Text Content' }
            }),
            terminate: vi.fn().mockResolvedValue(undefined)
        };

        (createWorker as any).mockResolvedValue(mockWorker);

        // Mock Canvas (JSDOM environment needed)
        // Canvas context is needed for page.render
        // We rely on 'jsdom' environment in vitest.config.ts

        const onProgress = vi.fn();

        // Mock Canvas implementation
        const mockContext = {
            drawImage: vi.fn(),
            // add other 2d context methods if needed by pdf.js render (mostly safe to ignore for mock)
        };
        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockContext),
            toDataURL: vi.fn().mockReturnValue('data:image/png;base64,dummy'),
            height: 0,
            width: 0
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        // Execute
        const result = await extractTextFromPdf(mockFile, onProgress);

        // Verify
        expect(createWorker).toHaveBeenCalledWith('eng+chi_sim+chi_tra');
        expect(result).toContain('Extracted Text Content');
        expect(onProgress).toHaveBeenCalled();
        expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should throw "Failed to initialize Tesseract" if createWorker fails', async () => {
        const mockFile = new File([''], 'test.pdf');
        mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0));

        // Valid PDF simulation logic is needed until the tesseract init point
        // Actually, in the current code, tesseract init happens *inside* the function but before the loop?
        // Let's check the code structure.
        // In ocrService.ts (reverted version):
        // 1. arrayBuffer
        // 2. getDocument
        // 3. createWorker

        // We need getDocument to succeed first.
        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve({ numPages: 1 })
        });

        const mockError = new Error('Network Error');
        (createWorker as any).mockRejectedValue(mockError);

        const onProgress = vi.fn();

        await expect(extractTextFromPdf(mockFile, onProgress)).rejects.toThrow(
            /Technical Detail.*Failed to initialize Tesseract.*Network Error/
        );
    });

    it('should throw an error if PDF loading fails', async () => {
        const mockFile = new File([''], 'test.pdf');
        mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0));

        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.reject(new Error('Invalid PDF'))
        });

        const onProgress = vi.fn();

        await expect(extractTextFromPdf(mockFile, onProgress)).rejects.toThrow(
            'Technical Detail: Invalid PDF'
        );
    });

    it('should reconstruct tables based on spatial gaps', async () => {
        const mockFile = new File([''], 'table.pdf');
        mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        const onProgress = vi.fn();

        // Mock Canvas for JSDOM
        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockContext),
            toDataURL: vi.fn().mockReturnValue('data:image/png;base64,dummy'),
            height: 0,
            width: 0
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve({
                numPages: 1,
                getPage: vi.fn().mockResolvedValue({
                    getViewport: vi.fn().mockReturnValue({ width: 500, height: 500 }),
                    render: vi.fn().mockReturnValue({ promise: Promise.resolve() })
                })
            })
        });

        const mockLines = [
            {
                words: [
                    { text: 'Item', bbox: { x0: 10, x1: 50 } },
                    { text: 'Price', bbox: { x0: 200, x1: 250 } } // Gap = 150 > 40
                ]
            },
            {
                words: [
                    { text: 'Apple', bbox: { x0: 10, x1: 60 } },
                    { text: '$1.00', bbox: { x0: 200, x1: 250 } }
                ]
            }
        ];

        (createWorker as any).mockResolvedValue({
            recognize: vi.fn().mockResolvedValue({
                data: {
                    text: 'Fallback text',
                    lines: mockLines
                }
            }),
            terminate: vi.fn()
        });

        const result = await extractTextFromPdf(mockFile, onProgress);

        expect(result).toContain('| Item | Price |');
        expect(result).toContain('| Apple | $1.00 |');
    });

});
