/* =================================================================
 * == Piano.js - 可复用的钢琴控件
 * =================================================================
 *
 * 这是一个独立的钢琴控件，它处理：
 * 1. HTML 构建 (可配置八度和起始音)
 * 2. 琴键高亮 (API)
 * 3. 主音指示器 (API)
 * 4. 点击发声 (Web Audio API)
 * 5. 点击事件回调 (API)
 *
 * ================================================================= */

class Piano {

    // --- 1. 私有字段 ---
    #container;
    #options;
    #audioContext;
    #keyMap; // (e.g., "C4" -> HTMLElement)
    #onClickCallback;

    // --- 2. 静态数据 ---

    // 钢琴键基础名称 (用于构建)
    static NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    // 将音符字母 (C, C#...) 映射到 0-11
    static NOTE_TO_BASE_MIDI = {
        'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
        'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };

    /**
     * @param {HTMLElement} containerEl - 将要容纳钢琴的 DOM 元素
     * @param {object} options - 配置对象
     * @param {number} [options.octaves=2] - 要绘制的八度数
     * @param {number} [options.startOctave=4] - 起始八度 (e.g., C4 = 4)
     * @param {boolean} [options.isClickable=false] - 琴键是否可点击 (并播放声音)
     * @param {boolean} [options.showNoteNames=true] - 是否在白键上显示音名
     * @param {boolean} [options.showTonicIndicator=true] - 是否构建 'Tonic' 指示器 DOM
     * @param {string} [options.localizedTonicText="Tonic"] - "Tonic" 指示器的文本
     */
    constructor(containerEl, options = {}) {
        if (!containerEl) {
            console.error("Piano.js: 容器元素 (containerEl) 未提供。");
            return;
        }

        // 1. 设置容器和选项
        this.#container = containerEl;
        this.#options = {
            octaves: 2,
            startOctave: 4,
            isClickable: false,
            showNoteNames: true,
            showTonicIndicator: true,
            localizedTonicText: "Tonic",
            ...options
        };

        // 2. 初始化 Web Audio API
        // (仅在可点击时创建，以节省资源)
        if (this.#options.isClickable) {
            this.#audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 3. 初始化查找表
        this.#keyMap = new Map();
        this.#onClickCallback = () => {}; // 默认为空函数

        // 4. 构建钢琴
        this.#createPianoHTML();

        // 5. 绑定事件 (如果需要)
        if (this.#options.isClickable) {
            this.#addClickListeners();
        }
    }

    /**
     * [私有] 构建钢琴的 HTML 结构
     */
    #createPianoHTML() {
        const piano = document.createElement("ul");
        piano.className = "piano";

        const noteCount = this.#options.octaves * 12; // 2 八度 = 24 键

        for (let i = 0; i <= noteCount; i++) {
            // 允许最后一个 C (e.g., C4 -> C6)
            if (i === noteCount && Piano.NOTE_NAMES[i % 12] !== 'C') {
                break;
            }

            const keyIndex = i % 12; // 0-11 (C, C#...)
            const keyName = Piano.NOTE_NAMES[keyIndex];
            const octave = this.#options.startOctave + Math.floor(i / 12);
            const noteName = `${keyName}${octave}`; // e.g., "C4", "C#4"

            // C4 = 60. (0 + 4*12 + 12 = 60). C1 = 24.
            const midiNote = Piano.NOTE_TO_BASE_MIDI[keyName] + (octave * 12);

            // --- 创建 <li> 元素 ---
            const li = document.createElement("li");
            const isBlack = keyName.includes("#");

            li.dataset.note = noteName;
            li.dataset.midi = midiNote;
            li.className = isBlack ? "black" : "white";

            // --- 1. (可选) 音名 ---
            if (this.#options.showNoteNames && !isBlack) {
                const noteNameSpan = document.createElement("span");
                noteNameSpan.className = "note-name";
                noteNameSpan.textContent = keyName; // 只显示 C, D, E...
                li.appendChild(noteNameSpan);
            }

            // --- 2. (ScaleVisualizer 需要) 音阶度数 ---
            // (我们只创建占位符。ScaleVisualizerEngine 将填充它)
            const scaleDegreeSpan = document.createElement("span");
            scaleDegreeSpan.className = "scale-degree";
            li.appendChild(scaleDegreeSpan);

            // --- 3. (可选) 主音指示器 ---
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

            // --- 4. 添加到父级并保存引用 ---
            if (isBlack) {
                piano.lastChild.appendChild(li); // 附加到前一个白键
            } else {
                piano.appendChild(li);
            }

            this.#keyMap.set(noteName, li);
        }

        this.#container.innerHTML = ''; // 清空 placeholder
        this.#container.appendChild(piano);
    }

    /**
     * [私有] 绑定所有琴键的点击/触摸事件
     */
    /**
     * [私有] 绑定所有琴键的点击/触摸事件
     */
    #addClickListeners() {
        this.#keyMap.forEach((keyEl, noteName) => {
            const midi = parseInt(keyEl.dataset.midi, 10);

            const playFunc = (event) => {
                // [!! 修复 !!]
                // 我们仍然需要 stopPropagation，因为黑键仍然在白键 *内部*。
                event.stopPropagation();

                // (关键) 恢复音频上下文
                if (this.#audioContext.state === 'suspended') {
                    this.#audioContext.resume();
                }

                // 1. 播放声音
                this.#playNote(midi);

                // 2. 调用外部回调
                this.#onClickCallback(noteName);
            };

            keyEl.addEventListener('mousedown', playFunc);
            keyEl.addEventListener('touchstart', playFunc);
            // (移除了 'mousedown' 和 'touchstart' 监听器)
        });
    }

    /**
     * [私有] 播放单个音符 (从 AudioPlayer.js 简化而来)
     * @param {number} midiNote - MIDI 音高 (e.g., 60)
     * @param {number} duration - 声音持续时间 (秒)
     */
    #playNote(midiNote, duration = 0.5) {
        const now = this.#audioContext.currentTime;
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        const oscillator = this.#audioContext.createOscillator();
        oscillator.type = 'triangle'; // 'sine'太柔, 'sawtooth'太粗, 'triangle'比较好
        oscillator.frequency.setValueAtTime(freq, now);

        const gainNode = this.#audioContext.createGain();

        // 简单的 ADSR (Attack, Decay, Sustain, Release) 包络
        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = 0.1;
        const releaseTime = 0.3; // 留一点尾音

        const scheduledEndTime = now + duration;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + attackTime); // 快速起音 (Attack)
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime); // 衰减 (Decay)

        // 保持 (Sustain)
        gainNode.gain.setValueAtTime(sustainLevel, scheduledEndTime - releaseTime);
        // 释音 (Release)
        gainNode.gain.linearRampToValueAtTime(0, scheduledEndTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.#audioContext.destination);

        oscillator.start(now);
        oscillator.stop(scheduledEndTime);
    }

    // =================================================================
    // =================== 4. 公共 API =================================
    // =================================================================

    /**
     * [API] 注册一个回调函数，在琴键被点击时触发
     * @param {function(string)} callback - (noteName: string) => void
     */
    onClick(callback) {
        if (typeof callback === 'function') {
            this.#onClickCallback = callback;
        }
    }

    /**
     * [API] 高亮一组琴键
     * @param {string[]} notesArray - e.g., ["C4", "E4", "G4"]
     * @param {string} [className="highlight"] - 要添加的 CSS 类
     */
    highlightKeys(notesArray, className = 'highlight') {
        notesArray.forEach(noteName => {
            const keyEl = this.#keyMap.get(noteName);
            if (keyEl) {
                keyEl.classList.add(className);
            }
        });
    }

    /**
     * [API] 显示指定音符的主音指示器
     * (前提是 'showTonicIndicator' 在构造时为 true)
     * @param {string} noteName - e.g., "C4"
     */
    showTonic(noteName) {
        const keyEl = this.#keyMap.get(noteName);
        if (keyEl) {
            const tonicEl = keyEl.querySelector(".tonic-indicator");
            if (tonicEl) {
                tonicEl.classList.add("show");
            }
        }
    }

    /**
     * [API] 清除所有高亮和主音指示器
     */
    clearAllHighlights() {
        this.#keyMap.forEach((keyEl) => {
            // 移除两个潜在的高亮类
            keyEl.classList.remove('highlight');
            keyEl.classList.remove('select-highlight');

            // 隐藏主音
            const tonicEl = keyEl.querySelector(".tonic-indicator");
            if (tonicEl) {
                tonicEl.classList.remove("show");
            }

            // (可选) 清空音阶度数
            const scaleDegreeEl = keyEl.querySelector(".scale-degree");
            if (scaleDegreeEl) {
                scaleDegreeEl.textContent = "";
            }
        });
    }
}
