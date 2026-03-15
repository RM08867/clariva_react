import React from 'react';
import { DATASET } from '../data/dataset';

export default function TextDisplay({
    preferences,
    inputText,
    contentRef,
    onWordClick,
    wordSelectMode,
    lineSelectMode,
    selectedLineIdx,
    onLineClick,
}) {
    // Split text into lines (by newline), then each line into words
    const lines = inputText.split('\n');

    const style = {
        fontFamily: preferences.font,
        fontSize: preferences.font_size + 'px',
        lineHeight: preferences.line_spacing,
        letterSpacing: preferences.letter_spacing + 'em',
        wordSpacing: preferences.word_spacing + 'em',
        color: DATASET.text_colors[preferences.text_color],
        backgroundColor: DATASET.background_colors[preferences.background_color],
    };

    const renderChar = (char, charIdx) => {
        const lowerChar = char.toLowerCase();
        const charStyle = {};

        if (preferences.active_highlights.includes('first_letter_bold') && charIdx === 0) {
            charStyle.fontWeight = '900';
        }
        if (preferences.active_highlights.includes('vowel_coloring') && 'aeiou'.includes(lowerChar)) {
            charStyle.color = DATASET.highlight_colors.vowels;
            charStyle.fontWeight = 'bold';
        }

        Object.entries(DATASET.confusing_letter_groups).forEach(([groupId, letters]) => {
            if (preferences.active_confusing_groups.includes(groupId) && letters.includes(lowerChar)) {
                charStyle.color = DATASET.highlight_colors[groupId];
                charStyle.fontWeight = 'bold';
            }
        });

        return (
            <span key={charIdx} style={charStyle}>{char}</span>
        );
    };

    const handleWordClick = (word, lineIdx, wordIdx, e) => {
        if (!onWordClick) return;
        e.stopPropagation();
        const cleanWord = word.replace(/[^a-zA-Z0-9'-]/g, '') || word;
        onWordClick(cleanWord, lineIdx, wordIdx);
    };

    const isSelectMode = wordSelectMode || lineSelectMode;

    return (
        <main className="main-area">
            <div className="main-container">
                {/* Word select mode banner */}
                {wordSelectMode && (
                    <div className="word-select-banner">
                        <span>👆 Click any word to hear it read aloud</span>
                    </div>
                )}
                {/* Line select mode banner */}
                {lineSelectMode && (
                    <div className="word-select-banner line-select-banner">
                        <span>👆 Click a word to read its sentence aloud</span>
                    </div>
                )}
                <div className="text-container no-scrollbar">
                    <div className="formatted-content" ref={contentRef} style={style}>
                        {lines.map((line, lineIdx) => {
                            const words = line.split(/\s+/).filter(Boolean);
                            if (words.length === 0) {
                                return <br key={lineIdx} />;
                            }
                            return (
                                <div
                                    key={lineIdx}
                                    className={`text-line paragraph-block ${selectedLineIdx === lineIdx ? 'text-line-selected' : ''}`}
                                    onClick={() => onLineClick && onLineClick(lineIdx)}
                                >
                                    {words.map((word, wordIdx) => (
                                        <React.Fragment key={wordIdx}>
                                            <span
                                                className={`word-clickable ${isSelectMode ? 'word-select-active' : ''}`}
                                                onClick={(e) => handleWordClick(word, lineIdx, wordIdx, e)}
                                            >
                                                {word.split('').map((char, charIdx) => renderChar(char, charIdx))}
                                            </span>
                                            {' '}
                                        </React.Fragment>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
