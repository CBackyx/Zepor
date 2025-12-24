import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadPdfToRemote } from './remoteOcrService';

describe('remoteOcrService', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should upload file and return markdown content on success', async () => {
        const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const mockResponse = {
            result: {
                md_content: '# Extracted Markdown'
            }
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const onProgress = vi.fn();
        // Pass undefined for url to use default
        const result = await uploadPdfToRemote(mockFile, undefined, onProgress);

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:8000/file_parse',
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData),
                signal: expect.any(AbortSignal) // Verify signal is passed
            })
        );
        expect(onProgress).toHaveBeenCalledWith('Uploading to http://localhost:8000/file_parse...');
        expect(result).toBe('# Extracted Markdown');
    });

    it('should use custom API URL if provided', async () => {
        const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const customUrl = 'http://custom-server.com/api';
        const mockResponse = { md_content: 'Custom' };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        await uploadPdfToRemote(mockFile, customUrl);

        expect(global.fetch).toHaveBeenCalledWith(
            customUrl,
            expect.objectContaining({
                method: 'POST'
            })
        );
    });

    it('should handle nested md_content in response', async () => {
        const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const mockResponse = {
            some_list: [
                {
                    details: {
                        md_content: 'Nested Markdown'
                    }
                }
            ]
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await uploadPdfToRemote(mockFile);
        expect(result).toBe('Nested Markdown');
    });

    it('should throw error on failed HTTP response', async () => {
        const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });

        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        await expect(uploadPdfToRemote(mockFile)).rejects.toThrow('Remote API Error: 500 Internal Server Error');
    });

    it('should return JSON string if no md_content found', async () => {
        const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const mockResponse = { other_data: '123' };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await uploadPdfToRemote(mockFile);
        expect(result).toContain('"other_data": "123"');
    });
});
