import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Volume2, Check } from 'lucide-react';

/**
 * Simple fuzzy matching using Levenshtein distance.
 * Returns true if the distance is within the allowed error threshold.
 */
function isFuzzyMatch(str1, str2, threshold = 0.25) {
    if (!str1 || !str2) return str1 === str2;
    if (str1 === str2) return true;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return distance / maxLen <= threshold;
}

export default function TalkModal({ isOpen, onClose, targetWord = '', mode = 'word' }) {
    const [entering, setEntering] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState('');
    const [mispronouncedWord, setMispronouncedWord] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEntering(true);
            setTranscript('');
            setFeedbackStatus('');
            // Robust state reset: in word mode, ensure targetWord is the default mispronouncedWord
            setMispronouncedWord(mode === 'word' ? targetWord : '');
            const timer = setTimeout(() => setEntering(false), 20);
            return () => clearTimeout(timer);
        } else {
            // Stop listening when closed to prevent mic staying on
            if (window.speechRecognitionInstance) {
                window.speechRecognitionInstance.stop();
            }
            setIsListening(false);
        }
    }, [isOpen, targetWord, mode]);

    const handleClose = () => {
        if (isListening && window.speechRecognitionInstance) {
            window.speechRecognitionInstance.stop();
        }
        setIsListening(false);
        setEntering(true);
        setTimeout(() => onClose(), 300);
    };

    const toggleListening = () => {
        if (isListening) {
            window.speechRecognitionInstance?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support the Web Speech API. Please try Chrome or Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        window.speechRecognitionInstance = recognition;
        recognition.lang = 'en-IN'; // Indian English
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setFeedbackStatus('');
            setTranscript('');
        };

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript.trim().toLowerCase();
            const cleanSpoken = spokenText.replace(/[.,!?()[\]{}"']/g, '').replace(/\s+/g, ' ').trim();
            const spokenNoSpaces = cleanSpoken.replace(/\s+/g, '');
            setTranscript(cleanSpoken);
            
            const cleanTarget = targetWord.replace(/[.,!?()[\]{}"']/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
            const targetWords = cleanTarget.split(/\s+/);

            if (mode === 'word') {
                const targetNoSpaces = cleanTarget.replace(/\s+/g, '');
                // Compare joined versions to handle accent-based word splits with 10% fuzzy threshold
                if (isFuzzyMatch(spokenNoSpaces, targetNoSpaces, 0.1)) {
                    setFeedbackStatus('correct');
                } else {
                    setFeedbackStatus('wrong');
                }
            } else if (mode === 'passage') {
                let isMatch = false;
                // Check if the spoken input matches any contiguous sequence of whole words in the target
                for (let start = 0; start < targetWords.length; start++) {
                    for (let end = start + 1; end <= targetWords.length; end++) {
                        const targetSlice = targetWords.slice(start, end);
                        const targetSliceNoSpaces = targetSlice.join('');
                        // Apply fuzzy matching (10% error threshold)
                        if (isFuzzyMatch(targetSliceNoSpaces, spokenNoSpaces, 0.1)) {
                            isMatch = true;
                            break;
                        }
                    }
                    if (isMatch) break;
                }

                if (isMatch) {
                    setFeedbackStatus('correct');
                    setMispronouncedWord('');
                } else {
                    setFeedbackStatus('wrong');
                    
                    if (spokenNoSpaces.length === 0) {
                        setMispronouncedWord(targetWords[0]);
                        return;
                    }

                    // Best fit alignment logic for feedback (with fuzzy awareness)
                    let bestWindowIdx = 0;
                    let maxMatches = -1;
                    const spokenWordsArr = cleanSpoken.split(/\s+/).filter(Boolean);
                    
                    if (spokenWordsArr.length > 0) {
                        for (let i = 0; i <= targetWords.length - spokenWordsArr.length; i++) {
                            let matches = 0;
                            for (let j = 0; j < spokenWordsArr.length; j++) {
                                if (isFuzzyMatch(targetWords[i + j], spokenWordsArr[j], 0.2)) {
                                    matches++;
                                }
                            }
                            if (matches > maxMatches || (matches === maxMatches && isFuzzyMatch(targetWords[i], spokenWordsArr[0], 0.2))) {
                                maxMatches = matches;
                                bestWindowIdx = i;
                            }
                        }

                        // Playback the entire attempted segment for context
                        const attemptedSegment = targetWords.slice(bestWindowIdx, bestWindowIdx + spokenWordsArr.length).join(' ');
                        setMispronouncedWord(attemptedSegment || targetWords[0]);
                    } else {
                        // If nothing was spoken, default to just the first word as a hint to avoid paragraph-wide playback
                        setMispronouncedWord(targetWords[0]);
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setFeedbackStatus('wrong');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const playCorrectPronunciation = () => {
        if ('speechSynthesis' in window) {
            // Fix bug: Prioritize targetWord in 'word' mode. In passage mode, default to mispronouncedWord 
            // and fallback to the first word instead of the whole paragraph.
            const textToPlay = mode === 'word' 
                ? targetWord 
                : (mispronouncedWord || targetWord.split(/\s+/)[0]);
            
            if (!textToPlay) return;

            const utterance = new SpeechSynthesisUtterance(textToPlay);
            utterance.lang = 'en-IN'; 
            utterance.rate = 0.9; 
            utterance.pitch = 1;

            const voices = window.speechSynthesis.getVoices();
            const indianVoice = voices.find(v => v.lang === 'en-IN')
                || voices.find(v => v.lang.startsWith('en-IN'))
                || voices.find(v => v.lang === 'hi-IN');
            if (indianVoice) {
                utterance.voice = indianVoice;
            }

            window.speechSynthesis.speak(utterance);
        } else {
            alert("Text-to-speech is not supported in this browser.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="talk-overlay">
            <div className={`talk-modal ${entering ? 'entering' : ''}`}>
                <h3 className="talk-title">Pronunciation Check</h3>
                <p className="talk-desc" style={{ marginBottom: '1rem', color: '#666' }}>
                    {mode === 'passage' ? 'Read any passage from the text:' : 'Click the mic and say this word:'}
                </p>
                <div style={{ 
                    fontSize: mode === 'passage' ? '1.2rem' : '2rem', 
                    fontWeight: 'bold', 
                    marginBottom: '1.5rem', 
                    color: '#333',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: mode === 'passage' ? '0.5rem' : '0',
                    backgroundColor: mode === 'passage' ? '#f9f9f9' : 'transparent',
                    borderRadius: '8px',
                    border: mode === 'passage' ? '1px solid #eee' : 'none',
                    textAlign: mode === 'passage' ? 'left' : 'center'
                }}>
                    "{targetWord}"
                </div>

                <div 
                    className={`talk-icon-circle ${isListening ? 'listening' : ''}`} 
                    onClick={toggleListening}
                    style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                        transform: isListening ? 'scale(1.15)' : 'scale(1)', 
                        backgroundColor: isListening ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 0, 0, 0.05)', 
                        margin: '0 auto',
                        boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.3)' : 'none',
                        border: isListening ? '2px solid #ef4444' : '2px solid transparent'
                    }}
                    title={isListening ? "Stop Listening" : "Start Listening"}
                >
                    <Mic size={40} color={isListening ? '#ef4444' : '#64748b'} />
                </div>
                
                {isListening && <p style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '1rem' }}>Listening...</p>}
                
                {transcript && (
                    <div style={{ marginTop: '1rem', fontStyle: 'italic', color: '#666', maxHeight: '100px', overflowY: 'auto' }}>
                        You said: "{transcript}"
                    </div>
                )}

                {feedbackStatus === 'correct' && targetWord && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32' }}>
                        <p style={{ fontWeight: 'bold', margin: '0' }}>✅ correct pronunciation</p>
                    </div>
                )}

                {feedbackStatus === 'wrong' && targetWord && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>❌ answer is wrong</p>
                        <button 
                            onClick={playCorrectPronunciation}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', marginBottom: '0' }}
                        >
                            <Volume2 size={18} /> Hear correct pronunciation
                        </button>
                    </div>
                )}

                <button className="talk-close-btn" onClick={handleClose} style={{ marginTop: '2rem', width: '100%', borderRadius: '16px' }}>
                    CLOSE
                </button>
            </div>
        </div>
    );
}
