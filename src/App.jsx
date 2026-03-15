import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TextDisplay from './components/TextDisplay';
import PreferencesDrawer from './components/PreferencesDrawer';
import InputBar from './components/InputBar';
import TalkModal from './components/TalkModal';
import SpeakerModal from './components/SpeakerModal';
import PlaybackControls from './components/PlaybackControls';
import { DEFAULT_PREFS } from './data/defaults';
import { generateTTS } from './utils/api';

import IntroPage from './pages/IntroPage';
import FeaturesPage from './pages/FeaturesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

/**
 * Extract the sentence containing the clicked word from the full text,
 * using line and word indices to resolve duplicates.
 */
function findSentenceByContext(fullText, clickedWord, lineIdx, wordIdx) {
    const lines = fullText.split('\n');
    const targetLine = lines[lineIdx];
    if (!targetLine) return clickedWord;

    const sentences = targetLine.split(/(?<=[.!?])\s+/);
    let currentWordGlobalIdx = 0;
    
    // Split line into words to find the global index of the clicked word
    const lineWords = targetLine.split(/\s+/).filter(Boolean);
    
    for (const sentence of sentences) {
        const sentenceWords = sentence.split(/\s+/).filter(Boolean);
        const sentenceEndIdx = currentWordGlobalIdx + sentenceWords.length;
        
        if (wordIdx >= currentWordGlobalIdx && wordIdx < sentenceEndIdx) {
            return sentence.trim();
        }
        currentWordGlobalIdx = sentenceEndIdx;
    }
    
    return targetLine.trim(); // Fallback to full line
}

function ReaderPage() {
    const [preferences, setPreferences] = useState({ ...DEFAULT_PREFS });
    const [inputText, setInputText] = useState('');
    const [displayText, setDisplayText] = useState('CLARIVA');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [talkModalOpen, setTalkModalOpen] = useState(false);
    const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
    const [wordSelectMode, setWordSelectMode] = useState(false);
    const [lineSelectMode, setLineSelectMode] = useState(false);
    const [selectedLineIdx, setSelectedLineIdx] = useState(null);
    const [selectedWord, setSelectedWord] = useState('');
    const [talkMode, setTalkMode] = useState('word');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showPlaybackControls, setShowPlaybackControls] = useState(false);
    const audioRef = useRef(null);
    const utteranceRef = useRef(null);
    const playbackTypeRef = useRef(null);

    useEffect(() => {
        const currentVisits = parseInt(localStorage.getItem('visits')) || 0;
        localStorage.setItem('visits', currentVisits + 1);
    }, []);
    const formattedContentRef = useRef(null);

    const handleReset = useCallback(() => {
        setPreferences(JSON.parse(JSON.stringify(DEFAULT_PREFS)));
    }, []);

    // Send button: copies input to display text and clears input
    const handleSend = useCallback(() => {
        if (inputText.trim()) {
            setDisplayText(inputText.trim());
            setInputText('');
        }
    }, [inputText]);

    /**
     * Stop any ongoing playback.
     */
    const stopPlayback = useCallback(() => {
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (playbackTypeRef.current === 'browser') {
            window.speechSynthesis?.cancel();
            utteranceRef.current = null;
        }
        playbackTypeRef.current = null;
        setIsPlaying(false);
        setShowPlaybackControls(false);
    }, []);

    const handlePause = useCallback(() => {
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.pause();
        }
        if (playbackTypeRef.current === 'browser') {
            window.speechSynthesis?.pause();
        }
        setIsPlaying(false);
    }, []);

    const handleResume = useCallback(() => {
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.play();
        }
        if (playbackTypeRef.current === 'browser') {
            window.speechSynthesis?.resume();
        }
        setIsPlaying(true);
    }, []);

    const handleSpeedChange = useCallback((newSpeed) => {
        setPlaybackSpeed(newSpeed);
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.playbackRate = newSpeed;
        }
    }, []);

    /**
     * Core TTS function — tries Gemini first, falls back to browser Speech API.
     */
    const speakText = useCallback(async (text) => {
        stopPlayback();

        const ttsCount = parseInt(localStorage.getItem('tts')) || 0;
        localStorage.setItem('tts', ttsCount + 1);

        setIsLoading(true);
        setStatusMsg('Generating voice...');

        try {
            const audio = await generateTTS(text);
            audio.playbackRate = playbackSpeed;
            audioRef.current = audio;
            playbackTypeRef.current = 'audio';
            setIsPlaying(true);
            setShowPlaybackControls(true);
            setIsLoading(false);
            setStatusMsg('Playing audio...');

            await new Promise((resolve) => {
                audio.onended = () => {
                    setIsPlaying(false);
                    setShowPlaybackControls(false);
                    playbackTypeRef.current = null;
                    audioRef.current = null;
                    resolve();
                };
                audio.onerror = () => {
                    setIsPlaying(false);
                    setShowPlaybackControls(false);
                    resolve();
                };
                audio.play();
            });
            setStatusMsg('');
        } catch (err) {
            console.warn('Gemini TTS failed, using browser speech:', err);
            setStatusMsg('Using browser voice...');
            setIsLoading(false);

            try {
                await new Promise((resolve, reject) => {
                    if (!window.speechSynthesis) {
                        reject(new Error('Speech synthesis not supported'));
                        return;
                    }
                    window.speechSynthesis.cancel();

                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'en-IN';
                    utterance.rate = playbackSpeed;
                    utterance.pitch = 1;

                    const voices = window.speechSynthesis.getVoices();
                    const indianVoice = voices.find(v => v.lang === 'en-IN')
                        || voices.find(v => v.lang.startsWith('en-IN'))
                        || voices.find(v => v.lang === 'hi-IN');
                    if (indianVoice) {
                        utterance.voice = indianVoice;
                    }

                    utteranceRef.current = utterance;
                    playbackTypeRef.current = 'browser';
                    setIsPlaying(true);
                    setShowPlaybackControls(true);

                    utterance.onend = () => {
                        setIsPlaying(false);
                        setShowPlaybackControls(false);
                        playbackTypeRef.current = null;
                        utteranceRef.current = null;
                        resolve();
                    };
                    utterance.onerror = (e) => {
                        setIsPlaying(false);
                        setShowPlaybackControls(false);
                        reject(e);
                    };
                    window.speechSynthesis.speak(utterance);
                });
                setStatusMsg('');
            } catch (fallbackErr) {
                console.error('All TTS failed:', fallbackErr);
                setStatusMsg('Voice generation failed');
            }
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg(''), 3000);
        }
    }, [playbackSpeed, stopPlayback]);

    const handleReadAloud = useCallback(async (text) => {
        setSpeakerModalOpen(false);
        await speakText(text);
    }, [speakText]);

    const handleStartWordSelect = useCallback(() => {
        setWordSelectMode(true);
        setLineSelectMode(false);
        setStatusMsg('Click a word to check pronunciation');
    }, []);

    const handleStartLineSelect = useCallback(() => {
        setLineSelectMode(true);
        setWordSelectMode(false);
        setStatusMsg('Click a word to check sentence pronunciation');
    }, []);

    const handleWordClick = useCallback(async (word, lineIdx, wordIdx) => {
        if (lineSelectMode) {
            setLineSelectMode(false);
            setStatusMsg('');
            // Use contextual search to resolve duplicate words
            const sentence = findSentenceByContext(displayText, word, lineIdx, wordIdx);
            setSelectedWord(sentence);
            setTalkMode('passage');
            setTalkModalOpen(true);
        } else {
            // Default behavior: open talk modal for this word
            setWordSelectMode(false);
            setStatusMsg('');
            setSelectedWord(word);
            setTalkMode('word');
            setTalkModalOpen(true);
        }
    }, [lineSelectMode, displayText]);

    return (
        <div className="reader-layout">
            <Header
                preferences={preferences}
                inputText={displayText}
                formattedContentRef={formattedContentRef}
                isLoading={isLoading}
                statusMsg={statusMsg}
            />

            <TextDisplay
                preferences={preferences}
                inputText={displayText}
                contentRef={formattedContentRef}
                onWordClick={handleWordClick}
                wordSelectMode={wordSelectMode}
                lineSelectMode={lineSelectMode}
                selectedLineIdx={selectedLineIdx}
                onLineClick={setSelectedLineIdx}
            />

            <PlaybackControls
                isVisible={showPlaybackControls}
                isPlaying={isPlaying}
                speed={playbackSpeed}
                onPause={handlePause}
                onResume={handleResume}
                onSpeedChange={handleSpeedChange}
                onStop={stopPlayback}
            />

            <PreferencesDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                preferences={preferences}
                onUpdatePreferences={setPreferences}
                onReset={handleReset}
            />

            <InputBar
                inputText={inputText}
                onTextChange={setInputText}
                onSend={handleSend}
                onOpenDrawer={() => setDrawerOpen(true)}
                onOpenTalkModal={() => {
                    setSelectedWord(displayText || inputText);
                    setTalkMode('passage');
                    setTalkModalOpen(true);
                }}
                onOpenSpeakerModal={() => setSpeakerModalOpen(true)}
                setLoading={setIsLoading}
                setStatus={setStatusMsg}
            />

            <TalkModal
                isOpen={talkModalOpen}
                onClose={() => setTalkModalOpen(false)}
                targetWord={selectedWord}
                mode={talkMode}
                onTranscriptConfirm={(newText) => {
                    setInputText(inputText + ' ' + newText);
                    setTalkModalOpen(false);
                }}
            />

            <SpeakerModal
                isOpen={speakerModalOpen}
                onClose={() => setSpeakerModalOpen(false)}
                fullText={displayText}
                onReadAloud={handleReadAloud}
                onStartWordSelect={handleStartWordSelect}
                onStartLineSelect={handleStartLineSelect}
            />
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<IntroPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/reader" element={<ReaderPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            </Routes>
        </BrowserRouter>
    );
}
