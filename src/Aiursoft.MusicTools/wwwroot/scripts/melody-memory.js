import Piano from "./Piano.js";
import confetti from "canvas-confetti";
import { MelodyGenerator } from "./MelodyGenerator.js";
import { getLocalizedText } from "./localization.js";

// --- Game State ---
const livesContainer = document.getElementById("lives-container");
const progressContainer = document.getElementById("progress-container");
const startOverlay = document.getElementById("start-overlay");
const gameOverOverlay = document.getElementById("game-over-overlay");
const finalScoreDisplay = document.getElementById("final-level");
const ingameRankDisplay = document.getElementById("ingame-rank");
const timerContainer = document.getElementById("timer-container");
const timerBar = document.getElementById("timer-bar");
const pianoContainer = document.getElementById("piano-container");
const gameContainer = document.getElementById("game-board");

const DIFFICULTY_VALUES = {
    practice: 0,
    "c-major": 1,
    tonal: 5,
    atonal: 15,
    scale: 0,
    root: 2,
    standard: 3,
    skip: 4,
    "prog-note": 0,
    "prog-bar": 7,
    "prog-double": 20,
};

let piano = null;
let sequence = [];
let playerStep = 0;
let level = 1;
let isPlayerTurn = false;
let lastRankText = "";

let lives = 3;
const maxLives = 3;
let perfectStreak = 0;
let isCurrentLevelPerfect = true;

let timerId = null;
let gameDifficulty = "music";
let playbackAbortController = null;

const OCTAVE_START = 3;
const OCTAVE_COUNT = 2; // 2 Octaves requested (Expanded Keyboard, C3 to C5)
let melodyGenerator = new MelodyGenerator();
let playbackDuration = 0;

// Define Notes and Scales
const ALL_NOTES_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];
const SCALE_Intervals = {
    Major: [0, 2, 4, 5, 7, 9, 11],
};

// Default valid notes
let validNotesForLevel = []; // Set in startGame
let currentKeyRoot = "C";

// --- Initialization ---

window.addEventListener("load", () => {
    // Initialize Piano and UI
    if (pianoContainer) {
        piano = new Piano(pianoContainer, {
            octaves: OCTAVE_COUNT,
            startOctave: OCTAVE_START,
            isClickable: true,
            showNoteNames: false,
        });
        piano.onClick((noteName) => handleInput(noteName));

        piano.bindToComputerKeyboard({
            // Lower octave (C3-B3) — white keys on QWERTY row
            'Q': 'C3', 'W': 'D3', 'E': 'E3', 'R': 'F3',
            'T': 'G3', 'Y': 'A3', 'U': 'B3',
            // Lower octave (C3-B3) — black keys on number row
            '2': 'C#3', '3': 'D#3', '5': 'F#3', '6': 'G#3', '7': 'A#3',
            // Upper octave (C4-B4) — white keys on ZXCV row
            'Z': 'C4', 'X': 'D4', 'C': 'E4', 'V': 'F4',
            'B': 'G4', 'N': 'A4', 'M': 'B4',
            // Upper octave (C4-B4) — black keys on ASDF row
            'S': 'C#4', 'D': 'D#4', 'G': 'F#4', 'H': 'G#4', 'J': 'A#4',
            // Final note
            ',': 'C5',
        });
    }

    updateLivesUI();

    // Bind Difficulty Update
    const startBtn = document.getElementById("start-game-btn");
    if (startBtn) {
        startBtn.addEventListener("click", () => startGame());
    }

    const diffInputs = document.querySelectorAll(
        'input[name="musicStyle"], input[name="gamePreview"], input[name="gameProgression"]'
    );
    if (diffInputs.length > 0) {
        diffInputs.forEach((input) => {
            input.addEventListener("change", () => {
                updateCurrentDifficultyDisplay();
                returnToStart();
            });
        });
        // Initial Update
        updateCurrentDifficultyDisplay();
    } else {
        console.warn("MelodyMemory: No difficulty inputs found to bind.");
    }
});

// Helper to calculate score dynamically from DOM
function getCalculatedDifficultyScore() {
    const styleVal =
        document.querySelector('input[name="musicStyle"]:checked')?.value ||
        "c-major";

    // If practice mode is selected, difficulty is always 0
    if (styleVal === "practice") return 0;

    const previewVal =
        document.querySelector('input[name="gamePreview"]:checked')?.value ||
        "scale";
    const progVal =
        document.querySelector('input[name="gameProgression"]:checked')
            ?.value || "prog-note";

    const score =
        (DIFFICULTY_VALUES[styleVal] || 0) +
        (DIFFICULTY_VALUES[previewVal] || 0) +
        (DIFFICULTY_VALUES[progVal] || 0);
    return score;
}

function updateCurrentDifficultyDisplay() {
    const el = document.getElementById("start-overlay-difficulty");
    if (el) {
        el.innerText = getCalculatedDifficultyScore();
    }
}

function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
        const abort = () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            resolve();
        }, ms);
        signal?.addEventListener("abort", abort, { once: true });
    });
}

function setStatus(key, fallback, error = false) {
    const status = document.getElementById("melody-status");
    status.textContent = key ? getLocalizedText(key, fallback) : "";
    status.classList.toggle("text-danger", error);
}

function returnToStart(error = false) {
    playbackAbortController?.abort();
    melodyGenerator.dispose();
    piano?.stopAll();
    isPlayerTurn = false;
    hideTimer();
    startOverlay.classList.remove("d-none");
    gameContainer.classList.add("d-none");
    gameContainer.classList.remove("d-flex");
    gameOverOverlay.classList.add("d-none");
    const button = document.getElementById("start-game-btn");
    button.disabled = false;
    button.textContent = getLocalizedText("start-game", "Start Game");
    setStatus(error ? "generation-failed" : null,
        "The melody could not be loaded. Please try again.", error);
    piContainerClickable(false);
}

window.startMelodyGame = () => startGame();

// --- Game Logic ---

async function startGame() {
    playbackAbortController?.abort();
    melodyGenerator.dispose();
    piano?.stopAll();
    hideTimer();
    isPlayerTurn = false;
    playbackAbortController = new AbortController();
    const signal = playbackAbortController.signal;
    const startBtn = document.getElementById("start-game-btn");
    startBtn.disabled = true;
    startBtn.textContent = getLocalizedText("loading-melody", "Preparing your melody...");
    setStatus("loading-melody", "Preparing your melody...");
    try {
        const styleRad = document.querySelector('input[name="musicStyle"]:checked');
        const previewRad = document.querySelector('input[name="gamePreview"]:checked');
        const progressionRad = document.querySelector('input[name="gameProgression"]:checked');
        captureGameConfig(styleRad, previewRad, progressionRad);
        const style = styleRad?.value || "c-major";
        const preview = previewRad?.value || "scale";
        gameDifficulty = style === "practice" ? "practice" : "music";
        currentKeyRoot = style === "tonal"
            ? ALL_NOTES_NAMES[Math.floor(Math.random() * ALL_NOTES_NAMES.length)] : "C";
        const rootIndex = ALL_NOTES_NAMES.indexOf(currentKeyRoot);
        validNotesForLevel = Array.from({ length: 25 }, (_, i) => i).filter(i =>
            style === "atonal" || SCALE_Intervals.Major.includes((i - rootIndex + 12) % 12))
            .map(i => `${ALL_NOTES_NAMES[i % 12]}${OCTAVE_START + Math.floor(i / 12)}`);
        melodyGenerator = new MelodyGenerator(currentKeyRoot, style === "atonal" ? "atonal" : "major");
        await Promise.all([piano?.waitForSamples(), melodyGenerator.generateSong(signal)]);
        if (signal.aborted) return;
        sequence = [];
        playbackDuration = 0;
        level = 1;
        lastRankText = "";
        lives = 3;
        perfectStreak = 0;
        updateLivesUI();
        updateInGameRank();
        setStatus(null);
        startOverlay.classList.add("d-none");
        gameOverOverlay.classList.add("d-none");
        gameContainer.classList.remove("d-none");
        gameContainer.classList.add("d-flex");
        await playPreview(preview, validNotesForLevel, signal);
        await delay(500, signal);
        await nextLevel(signal);
    } catch (error) {
        if (error.name !== "AbortError" && !signal.aborted) {
            console.error("[MelodyMemory] Could not start:", error);
            returnToStart(true);
        }
    } finally {
        if (playbackAbortController.signal === signal) {
            startBtn.disabled = false;
            startBtn.textContent = getLocalizedText("start-game", "Start Game");
        }
    }
}

async function playPreview(type, notesToPlay, signal) {
    if (type === "skip") return;

    piContainerClickable(false);

    let previewSequence = [];

    if (type === "root") {
        // Play just the first note (Root)
        previewSequence = [notesToPlay.find(note => note.slice(0, -1) === currentKeyRoot)];
    } else if (type === "standard") {
        // Play Standard A4
        previewSequence = ["A4"];
    } else {
        // Play the full determined scale
        previewSequence = notesToPlay;
    }

    // Play them
    for (let note of previewSequence) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (piano) await piano.playNote(note, 0.4, true); // Visual Always On for Preview
        await delay(500, signal);
    }
}

async function nextLevel(signal) {
    try {
        if (!signal) {
            if (playbackAbortController) {
                playbackAbortController.abort();
            }
            playbackAbortController = new AbortController();
            signal = playbackAbortController.signal;
        }

        isPlayerTurn = false;
        playerStep = 0;
        isCurrentLevelPerfect = true;

        hideTimer();
        piContainerClickable(false); // Visual indication

        updateInGameRank();

        setStatus("loading-melody", "Preparing your melody...");
        const next = await melodyGenerator.nextSequence(gameConfig.progressionMode || "prog-note", signal);
        if (signal.aborted) return;
        sequence = next.notes;
        playbackDuration = next.duration;
        setStatus(null);
        renderProgressDots(sequence.length);
        await delay(600, signal);
        let position = 0;
        for (let i = 0; i < sequence.length; i++) {
            const item = sequence[i];
            await delay((item.start - position) * 500, signal);
            updateDot(i, "active");
            const duration = item.end - item.start;
            if (piano) await piano.playNote(item.note, duration * 0.5 * 0.9, gameDifficulty === "practice");
            await delay(duration * 500, signal);
            position = item.end;
            updateDot(i, "inactive");
        }
        await delay((playbackDuration - position) * 500, signal);
        if (signal.aborted) return;
        isPlayerTurn = true;
        piContainerClickable(true);
        startTurnTimer();
    } catch (e) {
        if (e.name === "AbortError") return;
        console.error("[MelodyMemory] Error in nextLevel:", e);
        if (!signal?.aborted) returnToStart(true);
    }
}

function piContainerClickable(clickable) {
    if (!pianoContainer) return;
    if (clickable) {
        pianoContainer.classList.remove("unclickable");
    } else {
        pianoContainer.classList.add("unclickable");
    }
}

function handleInput(noteName) {
    if (!isPlayerTurn) return;

    stopTimer();

    const correctItem = sequence[playerStep];
    const correctNote = correctItem.note;

    if (noteName === correctNote) {
        updateDot(playerStep, "filled");
        playerStep++;

        if (playerStep === sequence.length) {
            handleLevelComplete();
        } else {
            startTurnTimer();
        }
    } else {
        handleMistake(noteName);
    }
}

function handleMistake(wrongNote) {
    lives--;
    isCurrentLevelPerfect = false;
    perfectStreak = 0;

    playErrorSound();
    updateLivesUI(true); // true means lost life

    // Visual Effect for Error
    if (pianoContainer) {
        // Target the actual piano element for the shadow
        const pianoEl = pianoContainer.querySelector(".piano");
        if (pianoEl) {
            pianoEl.classList.remove("damage-effect");
            void pianoEl.offsetWidth; // Trigger reflow
            pianoEl.classList.add("damage-effect");

            // Remove class after animation
            setTimeout(() => {
                pianoEl.classList.remove("damage-effect");
            }, 600);
        }
    }

    if (lives <= 0) {
        isPlayerTurn = false;
        hideTimer();
        const signal = playbackAbortController.signal;
        delay(800, signal).then(gameOver).catch(() => {});
    } else {
        // Stop input briefly during animation
        isPlayerTurn = false;
        hideTimer();

        // Resume game after delay
        const signal = playbackAbortController.signal;
        delay(500, signal).then(() => {
            isPlayerTurn = true;
            startTurnTimer();
        }).catch(() => {});
    }
}

function handleLevelComplete() {
    hideTimer();

    if (isCurrentLevelPerfect) {
        perfectStreak++;
        if (perfectStreak >= 3) {
            if (lives < maxLives) {
                lives++;
                playLifeUpSound();
                updateLivesUI(lives - 1);
                perfectStreak = 0;
            } else {
                perfectStreak = 0;
            }
        }
    } else {
        perfectStreak = 0;
    }

    level++;
    isPlayerTurn = false;
    piContainerClickable(false);

    const signal = playbackAbortController.signal;
    delay(800, signal).then(() => nextLevel(signal)).catch(error => {
        if (error.name !== "AbortError") console.error(error);
    });
}

// --- UI Helpers ---

function updateLivesUI(gainLifeIndex = -1) {
    if (!livesContainer) return;
    livesContainer.innerHTML = "";

    if (gameContainer) {
        if (lives <= 0) {
            gameContainer.classList.add("critical");
        } else {
            gameContainer.classList.remove("critical");
        }
    }

    for (let i = 0; i < maxLives; i++) {
        const heart = document.createElement("div");
        heart.classList.add("heart");
        heart.innerHTML = "❤";

        if (i < lives) {
            heart.classList.add("active");
        } else {
            heart.classList.add("lost");
        }

        if (i === gainLifeIndex) {
            heart.classList.add("gain");
        }
        livesContainer.appendChild(heart);
    }
}

function renderProgressDots(count) {
    if (!progressContainer) return;
    progressContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const dot = document.createElement("div");
        dot.classList.add("progress-dot");
        progressContainer.appendChild(dot);
    }
}

function updateDot(index, status) {
    if (!progressContainer || !progressContainer.children[index]) return;
    const dot = progressContainer.children[index];
    if (status === "active") {
        dot.classList.add("active");
    } else if (status === "inactive") {
        dot.classList.remove("active");
        dot.classList.remove("filled");
    } else if (status === "filled") {
        dot.classList.add("active");
        dot.classList.add("filled");
    }
}

// --- Timer ---

function getTimeLimit() {
    if (level >= 30) return 2500;
    if (level >= 20) return 3500;
    if (level >= 10) return 4500;
    return 6000;
}

function startTurnTimer() {
    stopTimer();
    if (!timerContainer || !timerBar) return;

    const duration = getTimeLimit();
    // opacity controlled by animation now, not class
    // timerContainer.classList.add("active");

    timerBar.style.animation = "none";
    timerBar.style.width = "100%";
    timerContainer.style.animation = "none";

    void timerBar.offsetWidth; // force reflow

    timerBar.style.animation = `timer-bar-shrink ${duration}ms linear forwards`;
    timerContainer.style.animation = `timer-container-fade ${duration}ms linear forwards`;

    timerId = setTimeout(() => {
        handleTimeout();
    }, duration);
}

function stopTimer() {
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
    if (timerBar) {
        const computedStyle = window.getComputedStyle(timerBar);
        const currentWidth = computedStyle.width;
        timerBar.style.animation = "none";
        timerBar.style.width = currentWidth;
    }
    if (timerContainer) {
        timerContainer.style.animation = "none";
        timerContainer.style.opacity = "0"; // reset to hidden
    }
}

function hideTimer() {
    stopTimer();
    if (timerContainer) timerContainer.classList.remove("active");
}

function handleTimeout() {
    lives--;
    isCurrentLevelPerfect = false;
    perfectStreak = 0;
    updateLivesUI();
    playErrorSound();

    if (lives < 0) {
        hideTimer();
        isPlayerTurn = false;
        const signal = playbackAbortController.signal;
        delay(500, signal).then(gameOver).catch(() => {});
    } else {
        // Trigger damage effect on timeout too
        if (pianoContainer) {
            const pianoEl = pianoContainer.querySelector(".piano");
            if (pianoEl) {
                pianoEl.classList.remove("damage-effect");
                void pianoEl.offsetWidth;
                pianoEl.classList.add("damage-effect");
                setTimeout(() => {
                    pianoEl.classList.remove("damage-effect");
                }, 600);
            }
        }

        if (gameContainer) {
            // gameContainer.style.background = "#4a2b2b"; // Removed as per request
            const signal = playbackAbortController.signal;
            delay(500, signal).then(() => {
                startTurnTimer();
            }).catch(() => {});
        }
    }
}

// --- Game Over & Rank ---

// --- Game Over & Rank ---

let gameConfig = {
    difficultyScore: 0,
    items: [],
};

// Update startGame to capture config
function captureGameConfig(styleRad, previewRad, progressionRad) {
    gameConfig.items = [];
    let totalDiff = 0;

    // Check if Practice Mode is selected
    const isPractice = styleRad && styleRad.value === "practice";

    // 1. Music Style
    if (styleRad) {
        const val = styleRad.value;
        const score = DIFFICULTY_VALUES[val] || 0; // Default 0 if missing
        const labelText =
            document.querySelector(`label[for="${styleRad.id}"] span.fw-bold`)
                ?.innerText || val;

        gameConfig.items.push({ name: labelText, score: score });
        totalDiff += score;
    }

    // 2. Preview Option
    if (previewRad) {
        const val = previewRad.value;
        let score = DIFFICULTY_VALUES[val] || 0;

        // If Practice Mode, force component score to 0 for display
        if (isPractice) score = 0;

        const labelText =
            document.querySelector(`label[for="${previewRad.id}"] span.fw-bold`)
                ?.innerText || val;

        gameConfig.items.push({ name: labelText, score: score });
        // NOTE: If score is 0, we still might want to visually show it or not.
        // User asked for "Difficulty 0" for Scale.
        totalDiff += score;
    }

    // 3. Progression Option
    if (progressionRad) {
        const val = progressionRad.value;
        let score = DIFFICULTY_VALUES[val] || 0;

        // If Practice Mode, force component score to 0 for display
        if (isPractice) score = 0;

        const labelText =
            document.querySelector(
                `label[for="${progressionRad.id}"] span.fw-bold`
            )?.innerText || val;

        gameConfig.items.push({ name: labelText, score: score });
        totalDiff += score;
    }

    // Determine Logic Mode
    gameConfig.progressionMode = progressionRad
        ? progressionRad.value
        : "prog-note";

    // Use the robust calculation for the actual score
    gameConfig.difficultyScore = getCalculatedDifficultyScore();
}

function getRankData(currentLevel) {
    if (currentLevel >= 25)
        return {
            emoji: "👑",
            text: getLocalizedText("grandmaster", "Grandmaster"),
            color: "#ff4c4c",
        };
    if (currentLevel >= 21)
        return {
            emoji: "💎",
            text: getLocalizedText("diamond", "Diamond"),
            color: "#b9f2ff",
        };
    if (currentLevel >= 17)
        return {
            emoji: "🥇",
            text: getLocalizedText("gold", "Gold"),
            color: "#ffd700",
        };
    if (currentLevel >= 13)
        return {
            emoji: "🥈",
            text: getLocalizedText("silver", "Silver"),
            color: "#c0c0c0",
        };
    if (currentLevel >= 9)
        return {
            emoji: "🥉",
            text: getLocalizedText("bronze", "Bronze"),
            color: "#cd7f32",
        };
    if (currentLevel >= 5)
        return {
            emoji: "🃏",
            text: getLocalizedText("intermediate", "Intermediate"),
            color: "#a0a0a0",
        };
    if (currentLevel >= 1)
        return {
            emoji: "🐥",
            text: getLocalizedText("rookie", "Rookie"),
            color: "#cd7f32",
        };
    return null;
}

function updateInGameRank() {
    if (!ingameRankDisplay) return;
    const rank = getRankData(level);
    if (rank) {
        if (rank.text !== lastRankText) {
            ingameRankDisplay.innerHTML = `<span>${rank.emoji}</span><span>${rank.text}</span>`;
            ingameRankDisplay.style.color = rank.color;
            ingameRankDisplay.style.transform = "scale(1.5)";
            setTimeout(
                () => (ingameRankDisplay.style.transform = "scale(1)"),
                300
            );
            lastRankText = rank.text;
        }
    } else {
        ingameRankDisplay.innerHTML = "";
        lastRankText = "";
    }
}

function gameOver() {
    isPlayerTurn = false;
    melodyGenerator.dispose();
    piano?.stopAll();
    if (playbackAbortController) {
        playbackAbortController.abort();
    }
    hideTimer();
    if (gameContainer) gameContainer.classList.remove("critical");

    // --- Calculate Scores ---
    const difficultyScore = gameConfig.difficultyScore;
    const totalScore = Math.max(0, level - 1) * difficultyScore;
    // Logic: If I am at Level 5, does it mean I solved 4 patterns or the sequence length is 5?
    // In this game, Level 1 = 1 note. Only after completing it, we go to Level 2.
    // So if I die at Level 5, I successfully completed Level 4 (4 notes).
    // Or does Level just mean the sequence length?
    // Usually code says `level++` AFTER complete. So if I am at level 5, I completed 4.
    // However, usually "Score" implies notes correctly played.
    // In this game `handleMistake` happens during playback or input.
    // Let's assume Score = (Level - 1) * Difficulty. If Level 1 death => 0 score.
    // Users usually prefer seeing "Level 5" implying they reached it.
    // But "30 notes" implies quantity.
    // Let's use (level - 1) as "Notes Correctly Reproduced".
    // Wait, `level` starts at 1. If I complete Lv 1, I go to Lv 2.
    const finalNoteCount = Math.max(0, level - 1);
    const finalTotalScore = finalNoteCount * difficultyScore;

    if (finalScoreDisplay) finalScoreDisplay.textContent = level; // "Level Reached" text remains Level

    const totalScoreEl = document.getElementById("final-total-score");
    if (totalScoreEl) totalScoreEl.textContent = finalTotalScore;

    // --- Fill Breakdown ---
    const detailsContainer = document.getElementById("difficulty-details");
    if (detailsContainer) {
        detailsContainer.innerHTML = "";
        gameConfig.items.forEach((item) => {
            const row = document.createElement("div");
            row.className =
                "d-flex justify-content-between border-bottom border-light border-opacity-10 pb-1";
            row.innerHTML = `<span>${item.name}</span><span class="text-warning fw-bold">+${item.score}</span>`;
            detailsContainer.appendChild(row);
        });

        // Add Total Difficulty Row
        const totalRow = document.createElement("div");
        totalRow.className = "d-flex justify-content-between fw-bold mt-1";
        totalRow.innerHTML = `<span>Difficulty Score</span><span class="text-info">${difficultyScore}</span>`;
        // We can localized "Difficulty Score" if strictly needed, but let's try to grab it from hidden
        const locDiff =
            document.querySelector('#loc-data [data-key="difficulty"]')
                ?.innerText || "Difficulty";
        totalRow.innerHTML = `<span>${locDiff}</span><span class="text-info">${difficultyScore}</span>`;
        detailsContainer.appendChild(totalRow);
    }

    // --- Formula String ---
    const calcEl = document.getElementById("score-calculation");
    if (calcEl) {
        const locNotes =
            document.querySelector('#loc-data [data-key="notes"]')?.innerText ||
            "Notes";
        const locDiffShort =
            document.querySelector('#loc-data [data-key="diff"]')?.innerText ||
            "Diff";
        calcEl.innerText = `${finalNoteCount} ${locNotes} × ${difficultyScore} ${locDiffShort}`;
    }

    const titleElement = gameOverOverlay.querySelector("h1"); // Wait, h2 in new HTML? `h2.display-4`
    // The querySelector might fail if we changed h1 to h2?
    // In new HTML it is <h2>.
    // const titleHeader = gameOverOverlay.querySelector('h2');
    // if (titleHeader) titleHeader.textContent = gameDifficulty === 'music' ? 'Game Over' : 'Game Over';
    // Just keep standard "Game Over" to avoid complexity or re-fetch localized string if needed.
    // Localizer["Game Over"] is already there.

    const rankDisplay = document.getElementById("rank-display");
    if (rankDisplay) {
        rankDisplay.innerHTML = "";
        const rank = getRankData(level);
        if (rank) {
            rankDisplay.innerHTML = `
                <div class="rank-emoji">${rank.emoji}</div>
                <div class="rank-text" style="color: ${rank.color}">${rank.text}</div>
            `;
            fireConfetti();
        }
    }

    // Switch UI Screens for Game Over
    // 1. Hide Game
    if (gameContainer) {
        gameContainer.classList.add("d-none");
        gameContainer.classList.remove("d-flex");
    }

    // 2. Show Game Over
    if (gameOverOverlay) {
        gameOverOverlay.classList.remove("d-none");
        // Since Game Over text is centered, we might not need d-flex if Card Body handles it.
        // But let's check html. The outer div is .card. It does not have d-flex.
        // Effectively just removing d-none brings it into flow as a block (card).
    }
}

// --- Audio Effects ---
const uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playErrorSound() {
    if (uiAudioCtx.state === "suspended") uiAudioCtx.resume();
    const osc = uiAudioCtx.createOscillator();
    const gain = uiAudioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, uiAudioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, uiAudioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, uiAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, uiAudioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(uiAudioCtx.destination);
    osc.start();
    osc.stop(uiAudioCtx.currentTime + 0.3);
}

function playLifeUpSound() {
    if (uiAudioCtx.state === "suspended") uiAudioCtx.resume();
    const osc = uiAudioCtx.createOscillator();
    const gain = uiAudioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(523.25, uiAudioCtx.currentTime);
    osc.frequency.setValueAtTime(783.99, uiAudioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, uiAudioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, uiAudioCtx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, uiAudioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(uiAudioCtx.destination);
    osc.start();
    osc.stop(uiAudioCtx.currentTime + 0.4);
}

function fireConfetti() {
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 3000 };
    var randomInRange = function (min, max) {
        return Math.random() * (max - min) + min;
    };

    var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            })
        );
        confetti(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            })
        );
    }, 250);
}

window.addEventListener("pagehide", () => {
    playbackAbortController?.abort();
    melodyGenerator.dispose();
    piano?.stopAll();
});
