'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import data from '../data.json';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const MODES = [
  { id: 'timed', label: 'Timed (60s)' },
  { id: 'passage', label: 'Passage mode' },
];

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getRandomPassage = (level) => {
  const list = data[level] ?? [];
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
};

const Confetti = ({ active }) => {
  const pieces = useMemo(() => {
    const colours = ['var(--yellow-400)', 'var(--blue-400)', 'var(--green-500)', 'var(--neutral-0)'];
    return Array.from({ length: 20 }, (_, index) => ({
      left: `${(index * 7) % 100}%`,
      delay: `${(index % 5) * 0.25}s`,
      duration: `${2 + (index % 3)}s`,
      color: colours[index % colours.length],
    }));
  }, []);

  return (
    <div className={`confetti ${active ? 'confetti-active' : ''}`} aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            background: piece.color,
          }}
        />
      ))}
    </div>
  );
};

export default function HomePage() {
  const [difficulty, setDifficulty] = useState('easy');
  const [mode, setMode] = useState('timed');
  const [passage, setPassage] = useState(() => data.easy[0] ?? { id: 'easy-1', text: '' });
  const [userInput, setUserInput] = useState('');
  const [keystrokes, setKeystrokes] = useState(0);
  const [errors, setErrors] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [testActive, setTestActive] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultSubtext, setResultSubtext] = useState('');
  const [finalStats, setFinalStats] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const typingAreaRef = useRef(null);

  const focusTypingArea = useCallback(() => {
    typingAreaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem('typing-personal-best');
    if (stored) {
      setPersonalBest(Number(stored));
    }
  }, []);

  useEffect(() => {
    setPassage(getRandomPassage('easy'));
  }, []);

  const resetSession = useCallback(
    ({ newPassage } = {}) => {
      setTestActive(false);
      setTestComplete(false);
      setElapsedSeconds(0);
      setUserInput('');
      setKeystrokes(0);
      setErrors(0);
      setResultMessage('');
      setResultSubtext('');
      setFinalStats(null);
      setCelebrating(false);
      if (newPassage) {
        setPassage(newPassage);
      }
    },
    []
  );

  const startTest = () => {
    if (testComplete) {
      resetSession();
    }
    if (!testActive) {
      setElapsedSeconds(0);
      setTestActive(true);
    }
    focusTypingArea();
  };

  const restartTest = () => {
    resetSession({ newPassage: getRandomPassage(difficulty) });
    focusTypingArea();
  };

  const handleDifficultyChange = (level) => {
    if (difficulty === level) {
      return;
    }
    setDifficulty(level);
    resetSession({ newPassage: getRandomPassage(level) });
  };

  const handleModeChange = (selectedMode) => {
    if (mode === selectedMode) {
      return;
    }
    setMode(selectedMode);
    resetSession();
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (testComplete) {
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
      }

      const isCharacter = event.key.length === 1;
      if (isCharacter && userInput.length >= passage.text.length) {
        event.preventDefault();
        return;
      }

      if (!testActive) {
        setElapsedSeconds(0);
        setTestActive(true);
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        setUserInput((prev) => prev.slice(0, -1));
        return;
      }

      if (!isCharacter) {
        return;
      }

      event.preventDefault();
      const expected = passage.text[userInput.length];
      if (event.key !== expected) {
        setErrors((prev) => prev + 1);
      }
      setKeystrokes((prev) => prev + 1);
      setUserInput((prev) => prev + event.key);
    },
    [testActive, testComplete, userInput.length, passage.text, mode]
  );

  useEffect(() => {
    if (!testActive || testComplete) {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [testActive, testComplete]);

  const finalizeTest = useCallback(() => {
    if (!testActive) {
      return;
    }

    setTestComplete(true);
    setTestActive(false);

    const duration = mode === 'timed' ? Math.min(elapsedSeconds, 60) : Math.max(elapsedSeconds, 1);
    const minutes = duration / 60 || 1 / 60;
    const correctCharacters = passage.text.split('').reduce((total, char, index) => {
      return userInput[index] === char ? total + 1 : total;
    }, 0);
    const wpm = Math.round((correctCharacters / 5) / minutes) || 0;
    const accuracy = keystrokes > 0 ? Math.round((correctCharacters / keystrokes) * 100) : 0;

    const isBaseline = personalBest === null;
    const beatBest = personalBest !== null && wpm > personalBest;
    const shouldUpdateBest = isBaseline || beatBest;

    if (shouldUpdateBest) {
      setPersonalBest(wpm);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('typing-personal-best', wpm.toString());
      }
    }

    if (beatBest) {
      setCelebrating(true);
    }

    setResultMessage(isBaseline ? 'Baseline Established!' : beatBest ? 'High Score Smashed!' : 'Test Complete!');
    setResultSubtext(
      isBaseline
        ? 'Your very first score is now locked in as a personal best. Keep improving!'
        : beatBest
        ? 'You just beat your own record! Celebrate the moment and keep the streak alive.'
        : 'Nice work! Keep practicing to chase down another personal best.'
    );

    setFinalStats({
      wpm,
      accuracy,
      duration,
      correct: correctCharacters,
      incorrect: errors,
    });
  }, [errors, elapsedSeconds, keystrokes, mode, passage.text, personalBest, testActive, userInput]);

  useEffect(() => {
    if (mode === 'timed' && elapsedSeconds >= 60 && testActive && !testComplete) {
      finalizeTest();
    }
  }, [elapsedSeconds, finalizeTest, mode, testActive, testComplete]);

  useEffect(() => {
    if (!testActive || testComplete) {
      return;
    }
    if (userInput.length >= passage.text.length) {
      finalizeTest();
    }
  }, [finalizeTest, passage.text.length, testActive, testComplete, userInput.length]);

  useEffect(() => {
    if (!celebrating) {
      return;
    }
    const timeout = setTimeout(() => setCelebrating(false), 3200);
    return () => clearTimeout(timeout);
  }, [celebrating]);

  const correctCharacters = useMemo(() => {
    return passage.text.split('').reduce((total, char, index) => {
      return userInput[index] === char ? total + 1 : total;
    }, 0);
  }, [passage.text, userInput]);

  const displayedWpm = elapsedSeconds > 0 ? Math.round((correctCharacters / 5) / (elapsedSeconds / 60)) || 0 : 0;
  const displayedAccuracy = keystrokes > 0 ? Math.max(0, Math.min(100, Math.round((correctCharacters / keystrokes) * 100))) : 100;
  const displayedTime = mode === 'timed' ? formatTime(Math.max(0, 60 - elapsedSeconds)) : formatTime(elapsedSeconds);

  const textChars = passage.text.split('');
  const personalBestDisplay = personalBest !== null ? `${personalBest} WPM` : 'Not set yet';

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">Typing Speed Test</p>
        <h1>Practice speed, accuracy, and focus.</h1>
        <p className="hero-copy">
          Choose a difficulty, toggle between timed and passage modes, and watch your personal best grow. Every keystroke
          counts toward your WPM and accuracy stats.
        </p>
      </header>
      <main className="app-shell">
        <section className="card control-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Test Controls</p>
              <h2>Ready when you are</h2>
            </div>
            <div className="best-chip">
              <span>Personal best</span>
              <strong>{personalBestDisplay}</strong>
            </div>
          </div>
          <div className="control-group">
            <p className="label">Difficulty</p>
            <div className="button-row">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className={`pill-button ${difficulty === level.id ? 'active' : ''}`}
                  onClick={() => handleDifficultyChange(level.id)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group">
            <p className="label">Mode</p>
            <div className="button-row">
              {MODES.map((selection) => (
                <button
                  key={selection.id}
                  type="button"
                  className={`pill-button ${mode === selection.id ? 'active mode' : ''}`}
                  onClick={() => handleModeChange(selection.id)}
                >
                  {selection.label}
                </button>
              ))}
            </div>
          </div>
          <div className="stat-grid">
            <article>
              <p className="stat-label">WPM</p>
              <p className="stat-value">{displayedWpm}</p>
            </article>
            <article>
              <p className="stat-label">Accuracy</p>
              <p className="stat-value">{displayedAccuracy}%</p>
            </article>
            <article>
              <p className="stat-label">Time</p>
              <p className="stat-value">{displayedTime}</p>
            </article>
          </div>
          <div className="action-row">
            <button type="button" className="primary" onClick={startTest}>
              {testActive ? 'Focus & Continue' : 'Start test'}
            </button>
            <button type="button" className="ghost" onClick={restartTest}>
              Restart passage
            </button>
          </div>
        </section>
        <section className="card typing-panel">
          <div className="typing-header">
            <div>
              <p className="eyebrow">Typing zone</p>
              <h2>Click here and type away</h2>
            </div>
            <p className="typing-hint">Select the passage or hit start to begin. Backspace can fix mistakes, but accuracy still accounts for earlier errors.</p>
          </div>
          <div
            ref={typingAreaRef}
            tabIndex={0}
            role="textbox"
            aria-label="Typing area"
            className="passage-wrapper"
            onClick={focusTypingArea}
            onKeyDown={handleKeyDown}
          >
            <div className="passage">
              {textChars.map((char, idx) => {
                const isCursor = idx === userInput.length && !testComplete && testActive;
                const status = idx < userInput.length ? (userInput[idx] === char ? 'correct' : 'incorrect') : '';
                return (
                  <span
                    key={`${char}-${idx}`}
                    className={`text-char ${status} ${isCursor ? 'cursor' : ''}`}
                    data-status={status || 'pending'}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </div>
          </div>
          {testComplete && finalStats && (
            <div className="results-card">
              <p className="result-message">{resultMessage}</p>
              <p className="result-subtext">{resultSubtext}</p>
              <div className="result-grid">
                <article>
                  <p className="result-label">WPM</p>
                  <strong className="result-value">{finalStats.wpm}</strong>
                </article>
                <article>
                  <p className="result-label">Accuracy</p>
                  <strong className="result-value">{finalStats.accuracy}%</strong>
                </article>
                <article>
                  <p className="result-label">Characters</p>
                  <strong className="result-value">
                    {finalStats.correct} correct / {finalStats.incorrect} incorrect
                  </strong>
                </article>
                <article>
                  <p className="result-label">Duration</p>
                  <strong className="result-value">{formatTime(finalStats.duration)}</strong>
                </article>
              </div>
            </div>
          )}
        </section>
      </main>
      <Confetti active={celebrating} />
    </div>
  );
}
