// =====================================================================
// =================== 1. 通用数据定义 ================================
// (这一部分保持不变)
// =====================================================================

const TONIC_PITCH_MAP = [
    { sharp: { t: "C4", b: "C3" },   flat: { t: "C4", b: "C3" } },   // 0: C
    { sharp: { t: "C#4", b: "C#3" }, flat: { t: "Db4", b: "Db3" } }, // 1: C#/Db
    { sharp: { t: "D4", b: "D3" },   flat: { t: "D4", b: "D3" } },   // 2: D
    { sharp: { t: "D#4", b: "D#3" }, flat: { t: "Eb4", b: "Eb3" } }, // 3: D#/Eb
    { sharp: { t: "E4", b: "E3" },   flat: { t: "E4", b: "E3" } },   // 4: E
    { sharp: { t: "F4", b: "F3" },   flat: { t: "F4", b: "F3" } },   // 5: F
    { sharp: { t: "F#4", b: "F#3" }, flat: { t: "Gb4", b: "Gb3" } }, // 6: F#/Gb
    { sharp: { t: "G4", b: "G3" },   flat: { t: "G4", b: "G3" } },   // 7: G
    { sharp: { t: "G#4", b: "G#3" }, flat: { t: "Ab4", b: "Ab3" } }, // 8: G#/Ab
    { sharp: { t: "A4", b: "A3" },   flat: { t: "A4", b: "A3" } },   // 9: A
    { sharp: { t: "A#4", b: "A#3" }, flat: { t: "Bb4", b: "Bb3" } }, // 10: A#/Bb
    { sharp: { t: "B4", b: "B3" },   flat: { t: "Cb4", b: "Cb3" } }  // 11: B/Cb
];

const notes = [
    "C", "C♯/D♭", "D", "D♯/E♭", "E", "F",
    "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B",
];
const circleOfFifthsOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const notesSharp = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B",
];
const keyDisplayNames = [
    'C', 'C♯ / D♭', 'D', 'E♭', 'E', 'F',
    'F♯ / G♭', 'G', 'A♭', 'A', 'B♭', 'B / C♭'
];
// (KEY_SIGNATURE_DATA 和 ACCIDENTAL_POSITIONS 已被移除, 它们现在属于 MusicStaff.js)


// =====================================================================
// =================== 2. 核心引擎类 ==================================
// =====================================================================
class ScaleVisualizerEngine {

    // [!! 新增 !!]
    #piano; // (私有) 用于存放 Piano.js 控件实例

    constructor(config, domElements) {
        // 1. 注入配置和 DOM
        this.config = config;
        this.domElements = domElements;

        // 2. 解构 DOM 元素 (不变)
        this.chromaticOuterCircle = domElements.chromaticOuterCircle;
        this.chromaticInnerCircle = domElements.chromaticInnerCircle;
        this.fifthsOuterCircle = domElements.fifthsOuterCircle;
        this.fifthsInnerCircle = domElements.fifthsInnerCircle;
        this.chromaticLeftBtn = domElements.chromaticLeftBtn;
        this.chromaticRightBtn = domElements.chromaticRightBtn;
        this.fifthsLeftBtn = domElements.fifthsLeftBtn;
        this.fifthsRightBtn = domElements.fifthsRightBtn;
        this.pianoContainer = domElements.pianoContainer;
        this.treblePair = domElements.treblePair;
        this.bassPair = domElements.bassPair;
        this.trebleStaffContainer = domElements.trebleStaffContainer;
        this.bassStaffContainer = domElements.bassStaffContainer;
        this.trebleKeyNameLabel = domElements.trebleKeyNameLabel;
        this.bassKeyNameLabel = domElements.bassKeyNameLabel;
        this.enhTreblePair = domElements.enhTreblePair;
        this.enhBassPair = domElements.enhBassPair;
        this.enhTrebleStaffContainer = domElements.enhTrebleStaffContainer;
        this.enhBassStaffContainer = domElements.enhBassStaffContainer;
        this.enhTrebleKeyNameLabel = domElements.enhTrebleKeyNameLabel;
        this.enhBassKeyNameLabel = domElements.enhBassKeyNameLabel;
        this.keySelectorDropdown = domElements.keySelectorDropdown;
        this.jianpuDisplayContainer = domElements.jianpuDisplayContainer;
        this.playStopButton = domElements.playStopButton;
        this.songSelector = domElements.songSelector;
        this.loopCheckbox = domElements.loopCheckbox;

        // 3. 配置 (不变)
        this.localizedTonic = config.localizedTonicText || "Tonic";
        this.scaleIntervals = config.scaleIntervals;
        this.fifthsDegreePositions = this.scaleIntervals.map(interval => {
            const index = circleOfFifthsOrder.indexOf(interval);
            return index !== -1 ? index : -99;
        });
        this.keyDefinitions = config.keyDefinitions;

        // 4. 状态 (不变)
        this.currentStep = config.defaultStep !== undefined ? config.defaultStep : 0;
        this.chromaticVisualAngle = this.currentStep * 30;
        this.fifthsVisualAngle = circleOfFifthsOrder.indexOf(this.currentStep) * 30;
        this.audioPlayer = null;

        // [!! 移除 !!]
        // this.pianoKeys = []; (不再需要)

        // 5. MusicStaff 控件 (不变)
        if (typeof MusicStaff !== 'undefined') {
            this.trebleStaff = new MusicStaff(this.trebleStaffContainer.id, { clef: 'treble' });
            this.bassStaff = new MusicStaff(this.bassStaffContainer.id, { clef: 'bass' });
            this.enhTrebleStaff = new MusicStaff(this.enhTrebleStaffContainer.id, { clef: 'treble' });
            this.enhBassStaff = new MusicStaff(this.enhBassStaffContainer.id, { clef: 'bass' });
        } else {
            console.error("MusicStaff.js 未加载。");
        }
    }

    // =====================================================================
    // =================== 3. 绘制函数 (已重构) ===========================
    // =====================================================================

    // [!! 移除 !!]
    // createPiano() 函数已被删除 (现在由 Piano.js 处理)

    // (createOuterNotes 和 createInnerDegrees 保持不变)
    createOuterNotes(parentCircle, orderArray) {
        const radius = (parentCircle.offsetWidth / 2) * 0.85;
        orderArray.forEach((noteIndex, i) => {
            const angle = (i / 12) * 360 - 90;
            const x = radius * Math.cos((angle * Math.PI) / 180);
            const y = radius * Math.sin((angle * Math.PI) / 180);
            const noteEl = document.createElement("div");
            noteEl.className = "note";
            noteEl.style.transform = `translate(${x}px, ${y}px)`;
            const labelEl = document.createElement("div");
            labelEl.className = "note-label";
            labelEl.textContent = notes[noteIndex];
            if (notes[noteIndex].includes("♯") || notes[noteIndex].includes("♭")) {
                noteEl.dataset.isBlackKey = "true";
            }
            noteEl.appendChild(labelEl);
            parentCircle.appendChild(noteEl);
        });
    }

    createInnerDegrees(parentCircle, positionsArray) {
        const radius = (parentCircle.offsetWidth / 2) * 0.8;
        positionsArray.forEach((positionValue, i) => {
            const angle = (positionValue / 12) * 360 - 90;
            const x = radius * Math.cos((angle * Math.PI) / 180);
            const y = radius * Math.sin((angle * Math.PI) / 180);
            const degreeEl = document.createElement("div");
            degreeEl.className = "degree";
            degreeEl.textContent = i + 1;
            degreeEl.style.transform = `translate(${x}px, ${y}px)`;
            parentCircle.appendChild(degreeEl);
        });
    }

    /**
     * [!! 核心重构 !!]
     * 此函数被完全重写，以使用 Piano.js API
     */
    updatePianoHighlight() {
        if (!this.#piano) return; // 确保钢琴已初始化

        // 1. [API] 清除所有旧的高亮、主音和音阶度数
        this.#piano.clearAllHighlights();

        const rootNoteIndex = this.currentStep;
        const notesToHighlight = [];
        let tonicNote = '';

        // 匹配 Piano.js 的默认起始八度
        // (Piano.js 默认 startOctave: 4)
        const startOctave = 4;

        // 2. 计算新的音符和音阶度数
        this.scaleIntervals.forEach((interval, i) => {
            const noteIndex = (rootNoteIndex + interval) % 12;
            const noteName = notesSharp[noteIndex]; // e.g., "C#", "F#"

            // 决定这个音符是在第一个八度 (startOctave) 还是第二个八度
            // e.g., A (9) 大调: B (11) -> B4; C# (1) -> C#5
            const currentOctave = (noteIndex < rootNoteIndex) ? (startOctave + 1) : startOctave;

            const fullNoteName = `${noteName}${currentOctave}`; // e.g., "C#5"

            notesToHighlight.push(fullNoteName);

            if (i === 0) {
                tonicNote = fullNoteName; // e.g., "A4"
            }

            // 3. [!! 关键 !!] 设置音阶度数
            // 我们仍然需要手动查询由 Piano.js 创建的 DOM 元素
            // (这是旧代码的遗留，但它仍然有效)
            const keyElement = this.pianoContainer.querySelector(`.piano [data-note="${fullNoteName}"]`);
            if (keyElement) {
                const scaleDegreeEl = keyElement.querySelector(".scale-degree");
                if (scaleDegreeEl) {
                    scaleDegreeEl.textContent = i + 1;
                }
            }
        });

        // 4. [API] 一次性应用所有高亮和主音
        this.#piano.highlightKeys(notesToHighlight); // (e.g., ["A4", "B4", "C#5", ...])
        this.#piano.showTonic(tonicNote); // (e.g., "A4")
    }


    // [!! 移除 !!]
    // createStaff() 和 addKeySignature() 函数已被删除
    // (现在由 MusicStaff.js 处理)

    // (updateKeySignatureDisplay 和 updateJianpuDisplay 保持不变)
    updateKeySignatureDisplay() {
        if (!this.trebleStaff) return;

        const tonic = this.currentStep;
        const definitions = this.keyDefinitions[tonic];

        if (!definitions) {
            this.treblePair.style.display = 'none';
            this.bassPair.style.display = 'none';
            this.enhTreblePair.style.display = 'none';
            this.enhBassPair.style.display = 'none';
            this.trebleStaff.clearAll();
            this.bassStaff.clearAll();
            this.enhTrebleStaff.clearAll();
            this.enhBassStaff.clearAll();
            return;
        }

        const tonicPitches = TONIC_PITCH_MAP[tonic];

        if (definitions.sharp) {
            const def = definitions.sharp;
            const pitch = tonicPitches.sharp;
            this.treblePair.style.display = 'block';
            this.bassPair.style.display = 'block';
            this.trebleKeyNameLabel.textContent = def.name;
            this.bassKeyNameLabel.textContent = def.name;
            this.trebleStaff.setKeySignature(def.signature);
            this.bassStaff.setKeySignature(def.signature);
            this.trebleStaff.showNote(pitch.t);
            this.bassStaff.showNote(pitch.b);
        } else {
            this.treblePair.style.display = 'none';
            this.bassPair.style.display = 'none';
            this.trebleStaff.clearAll();
            this.bassStaff.clearAll();
        }

        if (definitions.flat) {
            const def = definitions.flat;
            const pitch = tonicPitches.flat;
            const isEnharmonic = (definitions.sharp);

            const targetTrebleStaff = isEnharmonic ? this.enhTrebleStaff : this.trebleStaff;
            const targetBassStaff = isEnharmonic ? this.enhBassStaff : this.bassStaff;
            const targetTrebleLabel = isEnharmonic ? this.enhTrebleKeyNameLabel : this.trebleKeyNameLabel;
            const targetBassLabel = isEnharmonic ? this.enhBassKeyNameLabel : this.bassKeyNameLabel;
            const targetTreblePair = isEnharmonic ? this.enhTreblePair : this.treblePair;
            const targetBassPair = isEnharmonic ? this.enhBassPair : this.bassPair;

            targetTreblePair.style.display = 'block';
            targetBassPair.style.display = 'block';
            targetTrebleLabel.textContent = def.name;
            targetBassLabel.textContent = def.name;
            targetTrebleStaff.setKeySignature(def.signature);
            targetBassStaff.setKeySignature(def.signature);
            targetTrebleStaff.showNote(pitch.t);
            targetBassStaff.showNote(pitch.b);

            if (!isEnharmonic) {
                this.enhTreblePair.style.display = 'none';
                this.enhBassPair.style.display = 'none';
                this.enhTrebleStaff.clearAll();
                this.enhBassStaff.clearAll();
            }

        } else {
            this.enhTreblePair.style.display = 'none';
            this.enhBassPair.style.display = 'none';
            this.enhTrebleStaff.clearAll();
            this.enhBassStaff.clearAll();
        }
    }

    updateJianpuDisplay() {
        this.jianpuDisplayContainer.innerHTML = "";
        const definitions = this.keyDefinitions[this.currentStep];
        if (!definitions) return;
        Object.values(definitions).forEach(def => {
            const keyName = def.name.split(' ')[0];
            const jianpuText = `${this.config.jianpuPrefix}${keyName}`;
            const p = document.createElement("p");
            p.className = "h4 fw-bold mb-1";
            p.textContent = jianpuText;
            this.jianpuDisplayContainer.appendChild(p);
        });
    }

    // =====================================================================
    // =================== 4. 主更新与事件处理 ===========================
    // (update 和所有 on... 事件处理器保持不变)
    // =====================================================================

    update() {
        this.chromaticInnerCircle.style.transform = `translate(-50%, -50%) rotate(${this.chromaticVisualAngle}deg)`;
        this.fifthsInnerCircle.style.transform = `translate(-50%, -50%) rotate(${this.fifthsVisualAngle}deg)`;
        const centerTextElements = document.querySelectorAll(".current-key-display");
        centerTextElements[0].style.transform = `translate(-50%, -50%) rotate(${-this.chromaticVisualAngle}deg)`;
        centerTextElements[1].style.transform = `translate(-50%, -50%) rotate(${-this.fifthsVisualAngle}deg)`;
        document
            .querySelectorAll(".key-name")
            .forEach((display) => (display.textContent = keyDisplayNames[this.currentStep]));

        // [!! 关键 !!]
        // 这个 updatePianoHighlight() 现在调用的是我们重构后的新函数
        this.updatePianoHighlight();

        this.updateKeySignatureDisplay();
        this.updateJianpuDisplay();
        this.keySelectorDropdown.value = this.currentStep;
        if (this.audioPlayer) {
            this.audioPlayer.setKey(this.currentStep);
        }
    }

    onChromaticRight() {
        this.currentStep = (this.currentStep + 1) % 12;
        this.chromaticVisualAngle += 30;
        this.fifthsVisualAngle = circleOfFifthsOrder.indexOf(this.currentStep) * 30;
        this.update();
    }
    onChromaticLeft() {
        this.currentStep = (this.currentStep - 1 + 12) % 12;
        this.chromaticVisualAngle -= 30;
        this.fifthsVisualAngle = circleOfFifthsOrder.indexOf(this.currentStep) * 30;
        this.update();
    }
    onFifthsRight() {
        this.currentStep = (this.currentStep + 7) % 12;
        this.fifthsVisualAngle += 30;
        this.chromaticVisualAngle = this.currentStep * 30;
        this.update();
    }
    onFifthsLeft() {
        this.currentStep = (this.currentStep - 7 + 12) % 12;
        this.fifthsVisualAngle -= 30;
        this.chromaticVisualAngle = this.currentStep * 30;
        this.update();
    }
    onKeySelectChange() {
        const newStep = parseInt(this.keySelectorDropdown.value, 10);
        if (newStep === this.currentStep) return;
        this.currentStep = newStep;
        this.chromaticVisualAngle = this.currentStep * 30;
        this.fifthsVisualAngle = circleOfFifthsOrder.indexOf(this.currentStep) * 30;
        this.update();
    }

    // =====================================================================
    // =================== 5. 初始化 (已修改) ==============================
    // =====================================================================

    initialize() {

        // 1. [!! 修改 !!]
        // 移除了 this.createPiano()，替换为 new Piano()
        if (typeof Piano !== 'undefined') {
            this.#piano = new Piano(this.pianoContainer, {
                octaves: 2,         // 2 个八度 (C4..C6)
                startOctave: 4,     // 从 C4 开始
                isClickable: true, // 五度圈的钢琴只是显示，不能点
                showNoteNames: true,
                showTonicIndicator: true,
                localizedTonicText: this.localizedTonic
            });
        } else {
            console.error("Piano.js 未加载。");
        }

        // 2. [不变] 初始化音频播放器
        this.audioPlayer = new AudioPlayer({
            playStopButton: this.playStopButton,
            songSelector: this.songSelector,
            loopCheckbox: this.loopCheckbox
        });

        // 3. [不变] 填充下拉框
        this.keySelectorDropdown.innerHTML = '';
        const allKeyOptions = [];
        for (const tonicKey in this.keyDefinitions) {
            const tonic = parseInt(tonicKey, 10);
            const definitions = this.keyDefinitions[tonic];
            if (definitions.sharp) {
                allKeyOptions.push({
                    name: definitions.sharp.name,
                    value: tonic,
                    sort: definitions.sharp.signature.count
                });
            }
            if (definitions.flat) {
                if (!definitions.sharp || definitions.flat.name !== definitions.sharp.name) {
                    allKeyOptions.push({
                        name: definitions.flat.name,
                        value: tonic,
                        sort: -definitions.flat.signature.count
                    });
                }
            }
        }
        allKeyOptions.sort((a, b) => a.sort - b.sort);
        allKeyOptions.forEach(key => {
            const option = document.createElement("option");
            option.value = key.value;
            option.textContent = key.name;
            this.keySelectorDropdown.appendChild(option);
        });

        // 4. [不变] 绘制五度圈
        this.createOuterNotes(this.chromaticOuterCircle, [...Array(12).keys()]);
        this.createOuterNotes(this.fifthsOuterCircle, circleOfFifthsOrder);
        this.createInnerDegrees(this.chromaticInnerCircle, this.scaleIntervals);
        this.createInnerDegrees(this.fifthsInnerCircle, this.fifthsDegreePositions);

        // 5. [不变] 绑定事件处理器
        this.chromaticRightBtn.addEventListener("click", this.onChromaticRight.bind(this));
        this.chromaticLeftBtn.addEventListener("click", this.onChromaticLeft.bind(this));
        this.fifthsRightBtn.addEventListener("click", this.onFifthsRight.bind(this));
        this.fifthsLeftBtn.addEventListener("click", this.onFifthsLeft.bind(this));
        this.keySelectorDropdown.addEventListener("change", this.onKeySelectChange.bind(this));

        // 6. [不变] 首次加载
        this.update();
    }
}
