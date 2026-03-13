import React from 'react';
import { Pause, Play, X, Gauge } from 'lucide-react';

const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackControls({
    isVisible,
    isPlaying,
    speed,
    onPause,
    onResume,
    onSpeedChange,
    onStop,
}) {
    if (!isVisible) return null;

    const speedIndex = SPEED_STEPS.indexOf(speed);
    const sliderVal = speedIndex >= 0 ? speedIndex : 3; // default to 1x

    return (
        <div className="playback-controls">
            <div className="playback-inner">
                {/* Play/Pause */}
                <button
                    className="playback-btn playback-play-btn"
                    onClick={isPlaying ? onPause : onResume}
                    title={isPlaying ? 'Pause' : 'Resume'}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* Speed control */}
                <div className="playback-speed-section">
                    <div className="playback-speed-label">
                        <Gauge size={14} />
                        <span>{speed}x</span>
                    </div>
                    <input
                        type="range"
                        className="playback-speed-slider"
                        min={0}
                        max={SPEED_STEPS.length - 1}
                        step={1}
                        value={sliderVal}
                        onChange={(e) => onSpeedChange(SPEED_STEPS[parseInt(e.target.value)])}
                    />
                    <div className="playback-speed-range">
                        <span>0.25x</span>
                        <span>2x</span>
                    </div>
                </div>

                {/* Stop */}
                <button
                    className="playback-btn playback-stop-btn"
                    onClick={onStop}
                    title="Stop"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
