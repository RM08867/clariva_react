import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TextDisplay from './components/TextDisplay';
import PreferencesDrawer from './components/PreferencesDrawer';
import InputBar from './components/InputBar';
import TalkModal from './components/TalkModal';
import { DEFAULT_PREFS } from './data/defaults';

import IntroPage from './pages/IntroPage';
import FeaturesPage from './pages/FeaturesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function ReaderPage() {
    const [preferences, setPreferences] = useState({ ...DEFAULT_PREFS });
    const [inputText, setInputText] = useState('CLARIVA--Drop your text here.');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [talkModalOpen, setTalkModalOpen] = useState(false);
    const [selectedWord, setSelectedWord] = useState('');
    const [talkMode, setTalkMode] = useState('word');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        const currentVisits = parseInt(localStorage.getItem('visits')) || 0;
        localStorage.setItem('visits', currentVisits + 1);
    }, []);
    const formattedContentRef = useRef(null);

    const handleReset = useCallback(() => {
        setPreferences(JSON.parse(JSON.stringify(DEFAULT_PREFS)));
    }, []);

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
                onWordClick={(word) => {
                    setSelectedWord(word);
                    setTalkMode('word');
                    setTalkModalOpen(true);
                }}
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
