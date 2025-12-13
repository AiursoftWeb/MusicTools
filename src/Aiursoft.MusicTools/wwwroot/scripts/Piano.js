import * as Tone from "tone";
import { Piano as TonePiano } from "@tonejs/piano";

class Piano {
    // --- 1. 私有字段 ---
    #container;
    #options;
    #audioContext;
    #keyMap; // (e.g., "C4" -> HTMLElement)
    #onClickCallback;
    #activeKeys;
    #tonePianoInstance; // Instance of @tonejs/piano

    // --- 2. 静态数据 ---
    static NOTE_NAMES = [
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
    static NOTE_TO_BASE_MIDI = {
        C: 0,
        "C#": 1,
        D: 2,
        "D#": 3,
        E: 4,
        F: 5,
        "F#": 6,
        G: 7,
        "G#": 8,
        A: 9,
        "A#": 10,
        B: 11,
    };

    /**
     * ... (构造函数选项不变) ...
     */
    constructor(containerEl, options = {}) {
        if (!containerEl) {
            console.error("Piano.js: 容器元素 (containerEl) 未提供。");
            return;
        }
        // ... (构造函数 1-3 不变) ...
        this.#container = containerEl;
        this.#options = {
            octaves: 2,
            startOctave: 4,
            isClickable: false,
            showNoteNames: true,
            showTonicIndicator: true,
            localizedTonicText: "Tonic",
            ...options,
        };
        if (this.#options.isClickable) {
            this.#audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();

            // Initialize high-quality Tone.js Piano
            // Use local audio files for airgap deployment
            console.log(
                "[Piano.js] Initializing @tonejs/piano with local audio samples..."
            );
            this.#tonePianoInstance = new TonePiano({
                velocities: 5,
                // Use local audio files (copied from node_modules during build)
                url: "/dist/audio/salamander/",
            });
            this.#tonePianoInstance.toDestination();
            this.#tonePianoInstance
                .load()
                .then(() => {
                    console.log(
                        "[Piano.js] High-quality piano samples loaded from local storage!"
                    );
                })
                .catch((err) => {
                    console.error(
                        "[Piano.js] Failed to load piano samples:",
                        err
                    );
                    console.error(
                        "[Piano.js] Will fallback to oscillator synthesis"
                    );
                });
        }
        this.#keyMap = new Map();
        this.#onClickCallback = () => {};
        this.#activeKeys = new Set();

        // 4. 构建钢琴 (不变)
        this.#createPianoHTML();

        // 5. 绑定事件 (不变)
        if (this.#options.isClickable) {
            this.#addClickListeners();
        }
    }

    /**
     * [私有] 构建钢琴的 HTML 结构
     * (此函数 100% 不变)
     */
    #createPianoHTML() {
        const piano = document.createElement("ul");
        piano.className = "piano";
        const noteCount = this.#options.octaves * 12;
        for (let i = 0; i <= noteCount; i++) {
            if (i === noteCount && Piano.NOTE_NAMES[i % 12] !== "C") {
                break;
            }
            const keyIndex = i % 12;
            const keyName = Piano.NOTE_NAMES[keyIndex];
            const octave = this.#options.startOctave + Math.floor(i / 12);
            const noteName = `${keyName}${octave}`;
            const midiNote = Piano.NOTE_TO_BASE_MIDI[keyName] + octave * 12;
            const li = document.createElement("li");
            const isBlack = keyName.includes("#");
            li.dataset.note = noteName;
            li.dataset.midi = midiNote;
            li.className = isBlack ? "black" : "white";
            li.style.zIndex = noteCount - i;
            if (this.#options.showNoteNames && !isBlack) {
                const noteNameSpan = document.createElement("span");
                noteNameSpan.className = "note-name";
                noteNameSpan.textContent = keyName;
                li.appendChild(noteNameSpan);
            }
            const scaleDegreeSpan = document.createElement("span");
            scaleDegreeSpan.className = "scale-degree";
            li.appendChild(scaleDegreeSpan);
            if (this.#options.showTonicIndicator) {
                const tonicIndicator = document.createElement("div");
                tonicIndicator.className = "tonic-indicator";
                const tonicText = document.createElement("span");
                tonicText.className = "tonic-text";
                tonicText.textContent = this.#options.localizedTonicText;
                const tonicTriangle = document.createElement("span");
                tonicTriangle.className = "tonic-triangle";
                tonicTriangle.textContent = "▼";
                tonicIndicator.appendChild(tonicText);
                tonicIndicator.appendChild(tonicTriangle);
                li.appendChild(tonicIndicator);
            }
            if (isBlack) {
                piano.lastChild.appendChild(li);
            } else {
                piano.appendChild(li);
            }
            this.#keyMap.set(noteName, li);
        }
        this.#container.innerHTML = "";
        this.#container.appendChild(piano);
    }

    /**
     * [私有] [!! 终极修复 !!]
     * 绑定所有琴键的点击/触摸事件
     * (V3.0 - 区分触摸和鼠标，解决所有冲突)
     */
    #addClickListeners() {
        // 1. Check device type
        const isTouchDevice = "ontouchstart" in window;
        console.log(`[Piano.js] Touch device detected: ${isTouchDevice}`);

        this.#keyMap.forEach((keyEl, noteName) => {
            const midi = parseInt(keyEl.dataset.midi, 10);

            // Shared play sound function
            const playSound = () => {
                if (this.#audioContext.state === "suspended") {
                    this.#audioContext.resume();
                }
                // Ensure Tone.js context is started
                if (Tone.context.state === "suspended") {
                    Tone.start();
                }
                this.#playNote(midi);
            };

            if (isTouchDevice) {
                // --- A. Touch Device (Mobile/Tablet) Logic ---

                let isScrolling = false;
                let startX = 0,
                    startY = 0;

                keyEl.addEventListener(
                    "touchstart",
                    (event) => {
                        event.stopPropagation();
                        keyEl.classList.add("active");

                        // 1. Record start position
                        isScrolling = false;
                        startX = event.touches[0].clientX;
                        startY = event.touches[0].clientY;

                        // 2. Play sound immediately
                        playSound();
                    },
                    { passive: true }
                );

                keyEl.addEventListener(
                    "touchmove",
                    (event) => {
                        if (isScrolling) return;

                        const deltaX = Math.abs(
                            event.touches[0].clientX - startX
                        );
                        const deltaY = Math.abs(
                            event.touches[0].clientY - startY
                        );

                        // (10px threshold) If moved significantly, mark as scrolling
                        if (deltaX > 10 || deltaY > 10) {
                            isScrolling = true;
                            keyEl.classList.remove("active");
                        }
                    },
                    { passive: true }
                );

                keyEl.addEventListener("touchend", (event) => {
                    event.stopPropagation();
                    keyEl.classList.remove("active");

                    // Only trigger callback if not scrolling
                    if (!isScrolling) {
                        this.#onClickCallback(noteName);
                    }
                    isScrolling = false;
                });

                keyEl.addEventListener("touchcancel", (event) => {
                    keyEl.classList.remove("active");
                    isScrolling = false;
                });
            } else {
                // --- B. Mouse Device (Desktop) Logic ---

                keyEl.addEventListener("mousedown", (event) => {
                    event.stopPropagation();
                    keyEl.classList.add("active");

                    // Play sound and trigger callback immediately on press
                    playSound();
                    this.#onClickCallback(noteName);
                });

                const cleanup = () => {
                    keyEl.classList.remove("active");
                };
                keyEl.addEventListener("mouseup", cleanup);
                keyEl.addEventListener("mouseleave", cleanup);
            }
        });
    }

    /**
     * [私有] 播放单个音符
     * (此函数 100% 不变)
     */
    #playNote(midiNote, duration = 0.5) {
        // 1. Try to use High-Quality Piano
        if (this.#tonePianoInstance && this.#tonePianoInstance.loaded) {
            const noteName = Tone.Frequency(midiNote, "midi").toNote();
            this.#tonePianoInstance.keyDown({ note: noteName });
            this.#tonePianoInstance.keyUp({
                note: noteName,
                time: Tone.now() + duration,
            });
            return;
        }

        // 2. Fallback to Oscillator
        const now = this.#audioContext.currentTime;
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        const oscillator = this.#audioContext.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(freq, now);
        const gainNode = this.#audioContext.createGain();
        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = 0.1;
        const releaseTime = 0.3;
        const scheduledEndTime = now + duration;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + attackTime);
        gainNode.gain.linearRampToValueAtTime(
            sustainLevel,
            now + attackTime + decayTime
        );
        gainNode.gain.setValueAtTime(
            sustainLevel,
            scheduledEndTime - releaseTime
        );
        gainNode.gain.linearRampToValueAtTime(0, scheduledEndTime);
        oscillator.connect(gainNode);
        gainNode.connect(this.#audioContext.destination);
        oscillator.start(now);
        oscillator.stop(scheduledEndTime);
    }

    // =================================================================
    // =================== 4. 公共 API =================================
    // =================================================================

    // ... (onClick, highlightKeys, showTonic, clearAllHighlights 100% 不变) ...
    onClick(callback) {
        if (typeof callback === "function") {
            this.#onClickCallback = callback;
        }
    }
    highlightKeys(notesArray, className = "highlight") {
        notesArray.forEach((noteName) => {
            const keyEl = this.#keyMap.get(noteName);
            if (keyEl) {
                keyEl.classList.add(className);
            }
        });
    }
    showTonic(noteName) {
        const keyEl = this.#keyMap.get(noteName);
        if (keyEl) {
            const tonicEl = keyEl.querySelector(".tonic-indicator");
            if (tonicEl) {
                tonicEl.classList.add("show");
            }
        }
    }
    clearAllHighlights() {
        this.#keyMap.forEach((keyEl) => {
            keyEl.classList.remove("highlight");
            keyEl.classList.remove("select-highlight");
            const tonicEl = keyEl.querySelector(".tonic-indicator");
            if (tonicEl) {
                tonicEl.classList.remove("show");
            }
            const scaleDegreeEl = keyEl.querySelector(".scale-degree");
            if (scaleDegreeEl) {
                scaleDegreeEl.textContent = "";
            }
        });
    }

    // ... (bindToComputerKeyboard 100% 不变) ...
    // ... (bindToComputerKeyboard 100% 不变) ...
    playNote(noteName, duration = 0.5, visual = true) {
        const keyEl = this.#keyMap.get(noteName);
        if (!keyEl) {
            console.warn(
                `Piano.js: playNote called with invalid noteName: ${noteName}`
            );
            return;
        }

        // Play sound
        if (this.#audioContext && this.#audioContext.state === "suspended") {
            this.#audioContext.resume();
        }
        // Ensure Tone.js context is started
        if (
            typeof Tone !== "undefined" &&
            Tone.context &&
            Tone.context.state === "suspended"
        ) {
            Tone.start();
        }

        const midi = parseInt(keyEl.dataset.midi, 10);
        this.#playNote(midi, duration);

        // Visualize
        if (visual) {
            keyEl.classList.add("active");
            setTimeout(() => {
                keyEl.classList.remove("active");
            }, duration * 1000);
        }
    }

    bindToComputerKeyboard(keyMapping) {
        if (!this.#options.isClickable || !this.#audioContext) {
            console.warn(
                "Piano.js: 必须在 'isClickable: true' 模式下才能绑定键盘。"
            );
            return;
        }
        const noteToKeyMap = new Map();
        for (const [key, note] of Object.entries(keyMapping)) {
            noteToKeyMap.set(note, key);
        }
        document.addEventListener("keydown", (event) => {
            if (
                event.target.tagName === "INPUT" ||
                event.target.tagName === "TEXTAREA"
            ) {
                return;
            }
            const key = event.key.toUpperCase();
            if (this.#activeKeys.has(key) || event.repeat) {
                return;
            }
            const noteName = keyMapping[key];
            if (!noteName) {
                return;
            }
            const keyEl = this.#keyMap.get(noteName);
            if (!keyEl) {
                console.warn(`Piano.js: 键盘映射了不存在的音符 ${noteName}`);
                return;
            }
            console.log(`[Keyboard] KeyDown: ${key} -> ${noteName}`);
            this.#activeKeys.add(key);
            keyEl.classList.add("active");
            if (this.#audioContext.state === "suspended") {
                this.#audioContext.resume();
            }
            const midi = parseInt(keyEl.dataset.midi, 10);
            this.#playNote(midi);
            this.#onClickCallback(noteName);
        });
        document.addEventListener("keyup", (event) => {
            const key = event.key.toUpperCase();
            if (this.#activeKeys.has(key)) {
                this.#activeKeys.delete(key);
                const noteName = keyMapping[key];
                if (!noteName) return;
                const keyEl = this.#keyMap.get(noteName);
                if (keyEl) {
                    keyEl.classList.remove("active");
                }
            }
        });
    }
}

export default Piano;
