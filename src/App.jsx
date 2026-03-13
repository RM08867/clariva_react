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
 * Extract the sentence containing the clicked word from the full text.
 * Splits by sentence-ending punctuation (. ! ?) and finds which sentence
 * contains the word. Falls back to the full text if no match.
 */
function findSentenceContainingWord(fullText, clickedWord) {
    // Split text into sentences (keeping delimiters)
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    const lowerWord = clickedWord.toLowerCase();

    for (const sentence of sentences) {
        // Check if this sentence contains the word (as a whole word)
        const words = sentence.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/);
        if (words.includes(lowerWord)) {
            return sentence.trim();
        }
    }
    // Fallback: return the full text
    return fullText;
}

function ReaderPage() {
    const [preferences, setPreferences] = useState({ ...DEFAULT_PREFS });
    const [inputText, setInputText] = useState('CLARIVA--Drop your text here.');
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
    const audioRef = useRef(null);       // For Gemini TTS Audio element
    const utteranceRef = useRef(null);   // For browser SpeechSynthesis
    const playbackTypeRef = useRef(null); // 'audio' or 'browser'

    useEffect(() => {
        const currentVisits = parseInt(localStorage.getItem('visits')) || 0;
        localStorage.setItem('visits', currentVisits + 1);
    }, []);
    const formattedContentRef = useRef(null);

    const handleReset = useCallback(() => {
        setPreferences(JSON.parse(JSON.stringify(DEFAULT_PREFS)));
    }, []);

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

    /**
     * Pause playback.
     */
    const handlePause = useCallback(() => {
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.pause();
        }
        if (playbackTypeRef.current === 'browser') {
            window.speechSynthesis?.pause();
        }
        setIsPlaying(false);
    }, []);

    /**
     * Resume playback.
     */
    const handleResume = useCallback(() => {
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.play();
        }
        if (playbackTypeRef.current === 'browser') {
            window.speechSynthesis?.resume();
        }
        setIsPlaying(true);
    }, []);

    /**
     * Change playback speed.
     */
    const handleSpeedChange = useCallback((newSpeed) => {
        setPlaybackSpeed(newSpeed);
        if (playbackTypeRef.current === 'audio' && audioRef.current) {
            audioRef.current.playbackRate = newSpeed;
        }
        // For browser speech, speed changes take effect on next utterance
        // (SpeechSynthesis doesn't support live rate change)
    }, []);

    /**
     * Core TTS function — tries Gemini first, falls back to browser Speech API.
     * Returns when playback ends.
     */
    const speakText = useCallback(async (text) => {
        // Stop any existing playback first
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

                    // Try to find an Indian English voice
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

    /**
     * Called from SpeakerModal for "Read the Whole Text" option.
     */
    const handleReadAloud = useCallback(async (text) => {
        setSpeakerModalOpen(false);
        await speakText(text);
    }, [speakText]);

    /**
     * When user picks "Read a Word" — enters word selection mode.
     */
    const handleStartWordSelect = useCallback(() => {
        setWordSelectMode(true);
        setLineSelectMode(false);
        setStatusMsg('Click a word to read it aloud');
    }, []);

    /**
     * When user picks "Read This Line" — enters line selection mode.
     * User clicks a word and the sentence containing it is read.
     */
    const handleStartLineSelect = useCallback(() => {
        setLineSelectMode(true);
        setWordSelectMode(false);
        setStatusMsg('Click a word to read its sentence');
    }, []);

    /**
     * When a word is clicked in TextDisplay.
     * - In word-select mode: read just the word
     * - In line-select mode: find the sentence containing the word and read it
     */
    const handleWordClick = useCallback(async (word) => {
        if (wordSelectMode) {
            setWordSelectMode(false);
            setStatusMsg('');
            await speakText(word);
        } else if (lineSelectMode) {
            setLineSelectMode(false);
            setStatusMsg('');
            const sentence = findSentenceContainingWord(inputText, word);
            await speakText(sentence);
        }
    }, [wordSelectMode, lineSelectMode, speakText, inputText]);

    return (
        <div className="reader-layout">
            <Header
                preferences={preferences}
                inputText={inputText}
                formattedContentRef={formattedContentRef}
                isLoading={isLoading}
                statusMsg={statusMsg}
            />

            <TextDisplay
                preferences={preferences}
                inputText={inputText}
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
                onOpenDrawer={() => setDrawerOpen(true)}
                onOpenTalkModal={() => {
                    setSelectedWord(inputText);
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
                    // Append or replace depending on current text
                    if (inputText === 'CLARIVA--Drop your text here.') {
                        setInputText(newText);
                    } else {
                        setInputText(inputText + ' ' + newText);
                    }
                    setTalkModalOpen(false);
                }}
            />

            <SpeakerModal
                isOpen={speakerModalOpen}
                onClose={() => setSpeakerModalOpen(false)}
                fullText={inputText}
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
