
export interface RemoteOcrResponse {
    md_content?: string;
    // We can add other fields if we want to support them later, but strictly we just need md_content
    // based on the python script logic "find_md_in_obj"
    [key: string]: any;
}


const DEFAULT_API_URL = 'http://localhost:8000/file_parse';
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function uploadPdfToRemote(
    file: File,
    apiUrl: string = DEFAULT_API_URL,
    onProgress?: (message: string) => void
): Promise<string> {
    const formData = new FormData();
    formData.append('files', file);

    // Params from the python script:
    // "output_dir": "./demo_out", -> Not relevant for client receiving response
    // "backend": "pipeline",
    // "parse_method": "auto",
    // "return_md": True,
    // "return_content_list": True

    formData.append('backend', 'pipeline');
    formData.append('parse_method', 'auto');
    formData.append('return_md', 'true');
    formData.append('return_content_list', 'true');

    if (onProgress) onProgress(`Uploading to ${apiUrl}...`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ONE_HOUR_MS);

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Remote API Error: ${response.status} ${response.statusText}`);
        }

        if (onProgress) onProgress('Processing response...');

        const data = await response.json();
        const markdown = findMdInObj(data);

        if (!markdown && typeof markdown !== 'string') {
            // If no markdown found, dump the json (similar to python script fallback, though we want string)
            return JSON.stringify(data, null, 2);
        }

        return markdown || '';

    } catch (error) {
        console.error('Remote OCR Error:', error);
        throw error;
    }
}

// Helper to recursively find "md_content"
function findMdInObj(obj: any): string | null {
    if (!obj) return null;

    if (typeof obj === 'object') {
        if ('md_content' in obj && typeof obj.md_content === 'string') {
            return obj.md_content;
        }

        // Search values
        if (Array.isArray(obj)) {
            for (const item of obj) {
                const res = findMdInObj(item);
                if (res) return res;
            }
        } else {
            for (const key in obj) {
                const res = findMdInObj(obj[key]);
                if (res) return res;
            }
        }
    }

    return null;
}
