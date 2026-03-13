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
    const [inputText, setInputText] = useState('');
    const [displayText, setDisplayText] = useState('CLARIVA');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [talkModalOpen, setTalkModalOpen] = useState(false);
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

    const handleSend = useCallback(() => {
        if (inputText.trim()) {
            setDisplayText(inputText.trim());
            setInputText('');
        }
    }, [inputText]);

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
                onOpenTalkModal={() => setTalkModalOpen(true)}
                setLoading={setIsLoading}
                setStatus={setStatusMsg}
            />

            <TalkModal
                isOpen={talkModalOpen}
                onClose={() => setTalkModalOpen(false)}
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
