import Piano from "./Piano.js";
import confetti from "canvas-confetti";
import { MelodyGenerator } from "./MelodyGenerator.js";

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

const OCTAVE_START = 4;
const OCTAVE_COUNT = 3; // 3 Octaves requested (Expanded Keyboard)
let melodyGenerator = new MelodyGenerator();
let songBuffer = [];

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

// Generate Full Chromatic Map for the available range
let FULL_RANGE_NOTES = [];
for (let o = 0; o < OCTAVE_COUNT; o++) {
    const currentOctave = OCTAVE_START + o;
    ALL_NOTES_NAMES.forEach((n) =>
        FULL_RANGE_NOTES.push(`${n}${currentOctave}`)
    );
}

// Map of Root Note -> Array of Note Names (Spanning full available range that fit in scale)
// Note: If Key is G, and Range is C4-B5. G Major includes F#.
// We need to generate legal notes for the KEY across the ENTIRE range.
const SCALES = {};

ALL_NOTES_NAMES.forEach((rootNote) => {
    // Find index of root note in a theoretical infinite chromatic scale starting at C0?
    // Easier: Just check every note in FULL_RANGE_NOTES.
    // If interval from Root matches Major Scale interval, keep it.

    // 1. Get Root Index relative to C (0-11)
    const rootIndex = ALL_NOTES_NAMES.indexOf(rootNote);

    const validNotesForThisKey = FULL_RANGE_NOTES.filter((noteStr) => {
        // Extract note name and verify interval
        const noteName = noteStr.slice(0, -1); // e.g. "C#" or "G"
        const noteIndex = ALL_NOTES_NAMES.indexOf(noteName);

        // Calculate semitone distance from root (handling wrap around)
        let distance = (noteIndex - rootIndex + 12) % 12;

        return SCALE_Intervals.Major.includes(distance);
    });

    SCALES[rootNote] = validNotesForThisKey;
});

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
    }

    updateLivesUI();

    // Bind Difficulty Update
    const diffInputs = document.querySelectorAll(
        'input[name="musicStyle"], input[name="gamePreview"], input[name="gameProgression"]'
    );
    if (diffInputs.length > 0) {
        diffInputs.forEach((input) => {
            input.addEventListener("change", updateCurrentDifficultyDisplay);
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

// --- Public Control Functions (attached to window for buttons) ---
window.startMelodyGame = function () {
    startGame();
};

window.playDebugMelody = async function () {
    console.log(
        "%c🎶 Debug: Generating and Playing 16-Bar Song...",
        "color: #0dcaf0; font-weight: bold; font-size: 1.2em;"
    );

    // 1. Determine Scale
    let notesToPlay = validNotesForLevel;
    if (!notesToPlay || notesToPlay.length === 0) {
        console.warn(
            "⚠️ Game not started. Defaulting to C Major (C4-C5) for debug."
        );
        notesToPlay = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    } else {
        console.log(`🔑 Current Scale: ${notesToPlay.join(", ")}`);
    }

    // 2. Generate new block using a temporary generator
    const debugGen = new MelodyGenerator();

    // --- 关键修改点在这里 ---
    // 调用新的生成全曲方法
    debugGen.generateSong();
    // ---------------------

    // 3. Play it
    const buffer = debugGen.noteBuffer;
    console.table(buffer); // Show data in table

    console.log("▶️ playback started...");

    for (let i = 0; i < buffer.length; i++) {
        const item = buffer[i];

        // Use note name directly from Tonal generator
        const noteName = item.name;

        // Is it the start of a bar?
        if (item.isNewBar) {
            console.log(
                `%c| Bar Start |`,
                "color: #ffc107; font-weight: bold;"
            );
        }

        console.log(`🎵 Note: ${noteName}, Duration: ${item.duration}`);

        // Visual + Audio
        if (piano) piano.playNote(noteName, 0.4, true);

        // Wait for rhythm
        // Base Beat 500ms = 120 BPM
        await new Promise((r) => setTimeout(r, 500 * item.duration));
    }

    console.log(
        "%c✅ Debug: Playback Finished.",
        "color: #198754; font-weight: bold;"
    );
};

// --- Game Logic ---

async function startGame() {
    // Read Options
    const styleRad = document.querySelector('input[name="musicStyle"]:checked');
    const previewRad = document.querySelector(
        'input[name="gamePreview"]:checked'
    );
    const progressionRad = document.querySelector(
        'input[name="gameProgression"]:checked'
    );

    // Capture Difficulty Config
    captureGameConfig(styleRad, previewRad, progressionRad);

    // Default to C Major if nothing checked
    const style = styleRad ? styleRad.value : "c-major";
    const preview = previewRad ? previewRad.value : "scale";

    // Determine if we're in practice mode
    // In practice mode, exam sounds should be visualized
    gameDifficulty = style === "practice" ? "practice" : "music";

    // Set Up Key/Notes
    if (style === "atonal") {
        // Atonal: Use Chromatic Scale C4-C5 (1 Octave + 1 note)
        validNotesForLevel = [];
        const startIdx = ALL_NOTES_NAMES.indexOf("C");
        for (let i = 0; i <= 24; i++) {
            // Two Octaves Chromatic
            const noteAbsIndex = startIdx + i;
            const noteName = ALL_NOTES_NAMES[noteAbsIndex % 12];
            const octaveShift = Math.floor(noteAbsIndex / 12);
            validNotesForLevel.push(`${noteName}${OCTAVE_START + octaveShift}`);
        }
        currentKeyRoot = "C";
        console.log("Game Style: Atonal (Chromatic 2 Octaves)");
    } else {
        // Tonal or Practice (both use C Major scale)
        let rootNote = "C";

        if (style === "tonal") {
            // Random Key
            rootNote =
                ALL_NOTES_NAMES[
                    Math.floor(Math.random() * ALL_NOTES_NAMES.length)
                ];
        } else {
            // Forced C Major (for c-major and practice modes)
            rootNote = "C";
        }

        currentKeyRoot = rootNote;

        // Generate EXACTLY 2 Octaves of Valid Notes
        validNotesForLevel = [];

        const rootIndex = ALL_NOTES_NAMES.indexOf(rootNote);
        // Major Scale Steps extended to 2 octaves
        const majorSteps = [
            0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24,
        ];

        for (let step of majorSteps) {
            const noteAbsIndex = rootIndex + step;
            const noteName = ALL_NOTES_NAMES[noteAbsIndex % 12];
            const octaveShift = Math.floor((rootIndex + step) / 12);
            validNotesForLevel.push(`${noteName}${OCTAVE_START + octaveShift}`);
        }

        console.log(
            `Game Style: ${style} (${rootNote} Major) - Notes: ${validNotesForLevel.join(
                ", "
            )}`
        );
    }

    // Initialize Melody Generator with current Key
    // Use "major" scale (not pentatonic) to satisfy "GABCDE#FG" request
    melodyGenerator = new MelodyGenerator(
        currentKeyRoot,
        style === "atonal" ? "atonal" : "major"
    );

    sequence = [];
    songBuffer = []; // Reset buffer
    level = 1;

    lastRankText = "";
    lives = 3;
    perfectStreak = 0;
    updateLivesUI();
    updateInGameRank();

    if (startOverlay) startOverlay.classList.add("hidden");
    if (gameOverOverlay) gameOverOverlay.classList.add("hidden");

    // PLAY PREVIEW
    await playPreview(preview, validNotesForLevel);

    // Small delay before starting
    setTimeout(nextLevel, 500);
}

async function playPreview(type, notesToPlay) {
    if (type === "skip") return;

    piContainerClickable(false);

    let previewSequence = [];

    if (type === "root") {
        // Play just the first note (Root)
        previewSequence = [notesToPlay[0]];
    } else if (type === "standard") {
        // Play Standard A4
        previewSequence = ["A4"];
    } else {
        // Play the full determined scale
        previewSequence = notesToPlay;
    }

    // Play them
    for (let note of previewSequence) {
        if (piano) piano.playNote(note, 0.4, true); // Visual Always On for Preview
        await new Promise((r) => setTimeout(r, 500));
    }
}

async function nextLevel() {
    isPlayerTurn = false;
    playerStep = 0;
    isCurrentLevelPerfect = true;

    hideTimer();
    piContainerClickable(false); // Visual indication

    updateInGameRank();

    // Generate Note Logic
    const mode = gameConfig.progressionMode || "prog-note";
    let addedDuration = 0;
    const targetDuration =
        mode === "prog-double" ? 8 : mode === "prog-bar" ? 4 : 0;

    if (mode === "prog-note") {
        const nextMelodyItem = melodyGenerator.getNextNote();
        const sequenceItem = {
            note: nextMelodyItem.name,
            duration: nextMelodyItem.duration,
            isBarStart: nextMelodyItem.isBarStart,
        };
        sequence.push(sequenceItem);
    } else {
        // Bar or Double
        while (addedDuration < targetDuration) {
            const nextMelodyItem = melodyGenerator.getNextNote();

            const sequenceItem = {
                note: nextMelodyItem.name,
                duration: nextMelodyItem.duration,
                isBarStart: nextMelodyItem.isBarStart,
            };
            sequence.push(sequenceItem);
            addedDuration += nextMelodyItem.duration;
        }
    }

    // Render progress dots based on actual sequence length (not level number)
    // This is important for bar/double-bar modes where multiple notes are added per level
    renderProgressDots(sequence.length);

    await new Promise((r) => setTimeout(r, 600));

    // Playback sequence
    for (let i = 0; i < sequence.length; i++) {
        updateDot(i, "active");

        const item = sequence[i];
        const note = item.note;
        const duration = item.duration || 1.0;

        // In practice mode, show visual hints during exam playback
        // In all other modes, no visual hints during exam
        const useVisual = gameDifficulty === "practice";

        if (piano) piano.playNote(note, 0.4, useVisual);

        // Base Beat for 120 BPM = 500ms
        const baseBeat = 500;
        await new Promise((r) => setTimeout(r, baseBeat * duration));

        updateDot(i, "inactive");
    }

    isPlayerTurn = true;
    piContainerClickable(true);
    startTurnTimer();
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
    if (gameContainer) {
        gameContainer.classList.remove("wrong-input-animation");
        void gameContainer.offsetWidth; // Trigger reflow
        gameContainer.classList.add("wrong-input-animation");

        // Remove class after animation
        setTimeout(() => {
            if (gameContainer)
                gameContainer.classList.remove("wrong-input-animation");
        }, 500);
    }

    if (lives <= 0) {
        isPlayerTurn = false;
        hideTimer();
        setTimeout(gameOver, 800);
    } else {
        // Stop input briefly during animation
        isPlayerTurn = false;
        hideTimer();

        // Resume game after delay
        setTimeout(() => {
            isPlayerTurn = true;
            startTurnTimer();
        }, 500);
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

    setTimeout(nextLevel, 800);
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
    timerContainer.classList.add("active");

    timerBar.style.animation = "none";
    timerBar.style.width = "100%";
    timerBar.style.opacity = "0";
    void timerBar.offsetWidth; // force reflow

    timerBar.style.animation = `timer-countdown ${duration}ms linear forwards`;

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

    piContainerClickable(false);

    if (lives < 0) {
        hideTimer();
        setTimeout(gameOver, 500);
    } else {
        if (gameContainer) {
            gameContainer.style.background = "#4a2b2b";
            setTimeout(() => {
                gameContainer.style.background = ""; // reset to CSS defined
                piContainerClickable(true);
                startTurnTimer();
            }, 500);
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
        const score = DIFFICULTY_VALUES[val] || 0;
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
        const score = DIFFICULTY_VALUES[val] || 0;
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

function getLocalizedText(key, defaultText) {
    const el = document.querySelector(`#loc-data span[data-key="${key}"]`);
    return el ? el.innerText : defaultText;
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

    if (gameOverOverlay) gameOverOverlay.classList.remove("hidden");
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
