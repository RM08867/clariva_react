/**
 * API utility functions for CLARIVA.
 * Handles Gemini API calls for TTS, image OCR, and PDF text extraction.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Helper: fetch with automatic retry on 429 (rate limit) errors.
 * Waits the time suggested by the API, then retries up to maxRetries times.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} maxRetries
 * @param {function} onRetry - callback(waitSeconds) called before each retry wait
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, maxRetries = 2, onRetry = null) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.status === 429 && attempt < maxRetries) {
            // Parse retry delay from the error response
            const errorBody = await response.text().catch(() => '');
            const match = errorBody.match(/retry(?:Delay)?.*?(\d+)/i);
            const waitSeconds = match ? Math.min(parseInt(match[1]), 30) : 20;

            console.warn(`[API] Rate limited (429). Retrying in ${waitSeconds}s... (attempt ${attempt + 1}/${maxRetries})`);
            if (onRetry) onRetry(waitSeconds);

            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            continue;
        }

        return response;
    }
}

/**
 * Generate text-to-speech audio using Gemini TTS.
 * @param {string} text - The text to convert to speech.
 * @returns {Promise<HTMLAudioElement>} - An audio element ready to play.
 */
export async function generateTTS(text) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Kore" },
                        },
                    },
                },
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
    }

    const result = await response.json();
    const audioData =
        result.candidates[0].content.parts[0].inlineData.data;
    const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
        { type: "audio/wav" }
    );
    return new Audio(URL.createObjectURL(audioBlob));
}

/**
 * Extract text from an image using Gemini Vision.
 * Automatically retries on rate limit (429) errors.
 * @param {string} base64Data - Base64 encoded image data (without data URL prefix).
 * @param {string} mimeType - MIME type of the image (e.g. "image/jpeg").
 * @param {function} onStatus - optional callback to update UI status during retries
 * @returns {Promise<string|null>} - Extracted text or null.
 */
export async function extractTextFromImage(base64Data, mimeType = "image/png", onStatus = null) {
    if (!API_KEY) {
        throw new Error('Missing API key. Set VITE_GEMINI_API_KEY in your .env file.');
    }

    console.log('[OCR] Starting image extraction, mimeType:', mimeType, 'data length:', base64Data?.length);

    const requestBody = JSON.stringify({
        contents: [
            {
                parts: [
                    { text: "Extract all readable text from this image exactly as it appears. Preserve paragraph breaks using blank lines. Return only the extracted text, no explanations." },
                    {
                        inlineData: {
                            mimeType,
                            data: base64Data,
                        },
                    },
                ],
            },
        ],
    });

    const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
        },
        2,
        (waitSec) => {
            if (onStatus) onStatus(`Rate limited. Retrying in ${waitSec}s...`);
        }
    );

    if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body');
        console.error('[OCR] API error response:', response.status, errorBody);
        throw new Error(`Vision API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    console.log('[OCR] API response:', JSON.stringify(data).substring(0, 200));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (!text) {
        console.warn('[OCR] No text found in API response. Full response:', JSON.stringify(data));
    }
    return text;
}

/**
 * Extract text from a PDF file using pdf.js.
 * Reads all pages and concatenates the text.
 * @param {ArrayBuffer} pdfBuffer - The PDF file as an ArrayBuffer.
 * @returns {Promise<string>} - Extracted text from all pages.
 */
export async function extractTextFromPdf(pdfBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const textParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(' ');
        if (pageText.trim()) {
            textParts.push(pageText);
        }
    }

    return textParts.join('\n\n');
}

