import React, { useRef } from 'react';
import { FilePlus, Camera, Image, Volume2, Mic, Settings } from 'lucide-react';
import { extractTextFromImage, extractTextFromPdf } from '../utils/api';

export default function InputBar({
    inputText,
    onTextChange,
    onOpenDrawer,
    onOpenTalkModal,
    onOpenSpeakerModal,
    setLoading,
    setStatus,
}) {
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const handleTextInput = (e) => {
        onTextChange(e.target.value || 'CLARIVA **');
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
                const text = await extractTextFromImage(base64, mimeType);
                if (text) {
                    onTextChange(text);
                    setStatus('Text extracted!');
                } else {
                    setStatus('No text found in image');
                }
            } catch (err) {
                console.error('OCR Error:', err);
                setStatus('Image scan failed');
            } finally {
                setLoading(false);
                setTimeout(() => setStatus(''), 3000);
            }
        };
        reader.readAsDataURL(file);

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    /**
     * Handles PDF upload. Extracts text from all pages using pdf.js.
     * If pdf.js finds no text (scanned PDF), falls back to converting
     * pages to images and using Vision API OCR.
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
                setStatus('PDF text extracted!');
            } else {
                setStatus('No readable text found in PDF');
            }
        } catch (err) {
            console.error('PDF Error:', err);
            setStatus('PDF reading failed');
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(''), 3000);
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

            <input
                className="text-input"
                type="text"
                placeholder="Type or scan text..."
                value={inputText}
                onChange={handleTextInput}
            />

            <div className="input-action-group">
                <button className="tts-btn" onClick={onOpenSpeakerModal} title="Text to Speech">
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
