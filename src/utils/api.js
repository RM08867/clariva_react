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
                systemInstruction: {
                    parts: [{ text: "Speak with a natural Indian English accent. Use a warm, clear, and friendly tone." }],
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
 * @param {string} base64Data - Base64 encoded image data (without data URL prefix).
 * @param {string} mimeType - MIME type of the image (e.g. "image/jpeg").
 * @returns {Promise<string|null>} - Extracted text or null.
 */
export async function extractTextFromImage(base64Data, mimeType = "image/png") {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: "Extract all readable text from this image exactly as it appears. Return only the extracted text, no explanations." },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Data,
                                },
                            },
                        ],
                    },
                ],
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
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

