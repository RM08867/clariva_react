import React, { useRef } from 'react';
import { FilePlus, Camera, Image, Volume2, Mic, Settings, Send } from 'lucide-react';
import { generateTTS, extractTextFromImage, extractTextFromPdf } from '../utils/api';

export default function InputBar({
    inputText,
    onTextChange,
    onSend,
    onOpenDrawer,
    onOpenTalkModal,
    setLoading,
    setStatus,
}) {
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const handleTextInput = (e) => {
        onTextChange(e.target.value);
    };

    const handleKeyDown = (e) => {
        // Send on Enter (without Shift). Shift+Enter inserts a newline.
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputText.trim()) {
                onSend();
            }
        }
    };

    const handleTTS = async () => {
        const ttsCount = parseInt(localStorage.getItem('tts')) || 0;
        localStorage.setItem('tts', ttsCount + 1);

        setLoading(true);
        setStatus('Generating voice...');
        try {
            const audio = await generateTTS(inputText);
            audio.play();
        } catch (err) {
            console.error('TTS Error:', err);
            setStatus('Voice generation failed');
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(''), 2000);
        }
    };

    /**
     * Handles image files from both camera capture and gallery upload.
     * Reads the file, sends to Gemini Vision API for OCR, and updates the text.
     */
    const handleImageFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            setLoading(true);
            setStatus('Scanning image...');
            try {
                const base64 = ev.target.result.split(',')[1];
                const mimeType = file.type || 'image/png';
                console.log('[InputBar] Image loaded, type:', mimeType, 'base64 length:', base64?.length);
                const text = await extractTextFromImage(base64, mimeType, setStatus);
                if (text) {
                    onTextChange(text);
                    setStatus('Text extracted! Press Send to format.');
                } else {
                    setStatus('No text found in image');
                }
            } catch (err) {
                console.error('OCR Error:', err);
                setStatus(`Image scan failed: ${err.message}`);
            } finally {
                setLoading(false);
                setTimeout(() => setStatus(''), 5000);
            }
        };
        reader.onerror = (err) => {
            console.error('FileReader error:', err);
            setStatus('Failed to read image file');
            setLoading(false);
        };
        reader.readAsDataURL(file);

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    /**
     * Handles PDF upload. Extracts text from all pages using pdf.js.
     */
    const handlePdfChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus('Reading PDF...');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const text = await extractTextFromPdf(arrayBuffer);

            if (text && text.trim()) {
                onTextChange(text);
                setStatus('PDF text extracted! Press Send to format.');
            } else {
                setStatus('No readable text found in PDF');
            }
        } catch (err) {
            console.error('PDF Error:', err);
            setStatus('PDF reading failed');
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(''), 5000);
        }

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    return (
        <div className="input-bar">
            {/* Hidden file inputs */}
            <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleImageFile}
            />
            <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageFile}
            />
            <input
                type="file"
                ref={pdfInputRef}
                className="hidden"
                accept=".pdf,application/pdf"
                onChange={handlePdfChange}
            />

            <div className="input-file-group">
                <button className="icon-btn" onClick={() => pdfInputRef.current?.click()} title="Upload PDF">
                    <FilePlus />
                </button>
                <button className="icon-btn" onClick={() => cameraInputRef.current?.click()} title="Take Photo">
                    <Camera />
                </button>
                <button className="icon-btn" onClick={() => galleryInputRef.current?.click()} title="Upload Image">
                    <Image />
                </button>
            </div>

            <textarea
                className="text-input"
                placeholder="Type or scan text... (Enter to send, Shift+Enter for new line)"
                value={inputText}
                onChange={handleTextInput}
                onKeyDown={handleKeyDown}
                rows={2}
            />

            <button
                className="send-btn"
                onClick={() => { if (inputText.trim()) onSend(); }}
                title="Send to Format"
                disabled={!inputText.trim()}
            >
                <Send />
            </button>

            <div className="input-action-group">
                <button className="tts-btn" onClick={handleTTS} title="Text to Speech">
                    <Volume2 />
                </button>
                <button className="mic-btn" onClick={() => {
                    const sttCount = parseInt(localStorage.getItem('stt')) || 0;
                    localStorage.setItem('stt', sttCount + 1);
                    onOpenTalkModal();
                }} title="Voice Input">
                    <Mic />
                </button>
                <button className="settings-btn" onClick={onOpenDrawer} title="Settings">
                    <Settings />
                </button>
            </div>
        </div>
    );
}
