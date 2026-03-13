import React, { useState, useEffect } from 'react';
import { Volume2, X, Type, AlignLeft, FileText, Loader2 } from 'lucide-react';

export default function SpeakerModal({
    isOpen,
    onClose,
    fullText,
    onReadAloud,
    onStartWordSelect,
    onStartLineSelect,
}) {
    const [entering, setEntering] = useState(true);
    const [loadingOption, setLoadingOption] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setEntering(true);
            setLoadingOption(null);
            const timer = setTimeout(() => setEntering(false), 20);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        setEntering(true);
        setTimeout(() => onClose(), 300);
    };

    const handleReadLine = () => {
        onClose();
        onStartLineSelect();
    };

    const handleReadAll = async () => {
        setLoadingOption('full');
        try {
            await onReadAloud(fullText);
        } finally {
            setLoadingOption(null);
        }
    };

    const handleReadWord = () => {
        onClose();
        onStartWordSelect();
    };

    if (!isOpen) return null;

    return (
        <div className="speaker-overlay" onClick={handleClose}>
            <div
                className={`speaker-modal ${entering ? 'entering' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="speaker-modal-header">
                    <div className="speaker-icon-circle">
                        <Volume2 />
                    </div>
                    <h3 className="speaker-title">Read Aloud</h3>
                    <p className="speaker-desc">Choose what you'd like to hear</p>
                </div>

                {/* Options */}
                <div className="speaker-options">
                    <button
                        className="speaker-option-btn word-btn"
                        onClick={handleReadWord}
                        disabled={loadingOption !== null}
                    >
                        <div className="speaker-option-icon word-icon">
                            <Type />
                        </div>
                        <div className="speaker-option-text">
                            <span className="speaker-option-title">Read a Word</span>
                            <span className="speaker-option-sub">Click any word in the text</span>
                        </div>
                    </button>

                    <button
                        className="speaker-option-btn sentence-btn"
                        onClick={handleReadLine}
                        disabled={loadingOption !== null}
                    >
                        <div className="speaker-option-icon sentence-icon">
                            <AlignLeft />
                        </div>
                        <div className="speaker-option-text">
                            <span className="speaker-option-title">Read This Line</span>
                            <span className="speaker-option-sub">Click a word to read its sentence</span>
                        </div>
                    </button>

                    <button
                        className="speaker-option-btn fulltext-btn"
                        onClick={handleReadAll}
                        disabled={loadingOption !== null}
                    >
                        <div className="speaker-option-icon fulltext-icon">
                            {loadingOption === 'full' ? <Loader2 className="spin" /> : <FileText />}
                        </div>
                        <div className="speaker-option-text">
                            <span className="speaker-option-title">Read the Whole Text Out Loud</span>
                            <span className="speaker-option-sub">Reads everything from start to finish</span>
                        </div>
                    </button>
                </div>

                {/* Close Button */}
                <button className="speaker-close-btn" onClick={handleClose}>
                    <X size={18} />
                    CLOSE
                </button>
            </div>
        </div>
    );
}
