import React from 'react';
import { DATASET } from '../data/dataset';

export default function TextDisplay({ preferences, inputText, contentRef }) {
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

    const renderWord = (word, wordIdx) => {
        if (!word) return null;
        return (
            <React.Fragment key={wordIdx}>
                <span className="inline-block">
                    {word.split('').map((char, charIdx) => renderChar(char, charIdx))}
                </span>
                {' '}
            </React.Fragment>
        );
    };

    // Split text into paragraphs by any newline(s)
    // Each line break creates a new paragraph for clear visual separation
    const paragraphs = inputText.split(/\n/).map(p => p.trim()).filter(Boolean);

    return (
        <main className="main-area">
            <div className="main-container">
                <div className="text-container no-scrollbar">
                    <div className="formatted-content" ref={contentRef} style={style}>
                        {paragraphs.map((paragraph, pIdx) => {
                            const words = paragraph.split(/\s+/);
                            return (
                                <p key={pIdx} className="paragraph-block">
                                    {words.map((word, wordIdx) => renderWord(word, wordIdx))}
                                </p>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
