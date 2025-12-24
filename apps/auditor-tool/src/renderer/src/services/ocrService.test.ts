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

    it('should handle CJK and English spacing correctly', async () => {
        const mockFile = new File([''], 'cjk_test.pdf');
        mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        // Mock PDF Document Loading
        (pdfjsLib.getDocument as any).mockReturnValue({
            promise: Promise.resolve({
                numPages: 1,
                getPage: vi.fn().mockResolvedValue({
                    getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
                    render: vi.fn().mockReturnValue({ promise: Promise.resolve() })
                })
            })
        });

        // Mock Tesseract result with words
        const mockLines = [
            {
                words: [
                    { text: 'Hello', bbox: {} },
                    { text: 'World', bbox: {} }, // Eng-Eng -> Space
                    { text: '你好', bbox: {} },     // Eng-CJK -> No space (or space depending on preference, logic says no space if adjacent to CJK?)
                    // Logic: prev=World(Eng), curr=你好(CJK). prevIsCJK=false, currIsCJK=true. -> No space.
                    { text: '世界', bbox: {} }     // CJK-CJK -> No space
                ]
            }
        ];

        // Re-mock createWorker to return logic capable result
        (createWorker as any).mockResolvedValue({
            recognize: vi.fn().mockResolvedValue({
                data: {
                    text: 'Fallback',
                    lines: mockLines,
                    words: mockLines[0].words // Assuming flat words array is also populated if logic uses it, but our logic uses lines now
                }
            }),
            terminate: vi.fn()
        });

        // Need to ensure pdf loading succeeds too
        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockContext),
            toDataURL: vi.fn().mockReturnValue('data:image/png;base64,dummy'),
            height: 0,
            width: 0
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        // ... existing pdf setup reuse ...
        const onProgress = vi.fn();
        const result = await extractTextFromPdf(mockFile, onProgress);

        // Expected logic: "Hello" + " " + "World" + "" + "你好" + "" + "世界"
        // "Hello World你好世界"
        expect(result).toContain('Hello World你好世界');
    });

});
