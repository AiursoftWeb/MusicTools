// =====================================================================
// =================== 1. 通用数据定义 ================================
// =====================================================================

// [新添加] 映射每个主音索引 (0-11) 到高音谱表和低音谱表的具体音高
// 我们定义了 sharp (#) 和 flat (b) 两种拼写，以匹配调号
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
    "C",
    "C♯/D♭",
    "D",
    "D♯/E♭",
    "E",
    "F",
    "F♯/G♭",
    "G",
    "G♯/A♭",
    "A",
    "A♯/B♭",
    "B",
];
const circleOfFifthsOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C, G, D...
const notesSharp = [
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
const keyDisplayNames = [
    'C',        // 0
    'C♯ / D♭', // 1
    'D',        // 2
    'E♭',       // 3
    'E',        // 4
    'F',        // 5
    'F♯ / G♭', // 6
    'G',        // 7
    'A♭',       // 8
    'A',        // 9
    'B♭',       // 10
    'B / C♭'   // 11
];
const KEY_SIGNATURE_DATA = {
    0: { sharp: { type: 'sharps', count: 0 } }, // C
    7: { sharp: { type: 'sharps', count: 1 } }, // G
    2: { sharp: { type: 'sharps', count: 2 } }, // D
    9: { sharp: { type: 'sharps', count: 3 } }, // A
    4: { sharp: { type: 'sharps', count: 4 } }, // E
    11: { sharp: { type: 'sharps', count: 5 }, flat: { type: 'flats', count: 7 } }, // B/Cb
    6: { sharp: { type: 'sharps', count: 6 }, flat: { type: 'flats', count: 6 } }, // F#/Gb
    1: { sharp: { type: 'sharps', count: 7 }, flat: { type: 'flats', count: 5 } }, // C#/Db
    5: { flat: { type: 'flats', count: 1 } }, // F
    10: { flat: { type: 'flats', count: 2 } }, // Bb
    3: { flat: { type: 'flats', count: 3 } }, // Eb
    8: { flat: { type: 'flats', count: 4 } }, // Ab
};
const ACCIDENTAL_POSITIONS = {
    treble: {
        sharps: [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
        flats:  [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
    },
    bass: {
        sharps: [1, 2.5, 0.5, 2, 3.5, 1.5, 3],
        flats:  [3, 1.5, 3.5, 2, 4, 2.5, 4.5],
    },
};


// =====================================================================
// =================== 2. 核心引擎类 ==================================
// =====================================================================
class ScaleVisualizerEngine {

    constructor(config, domElements) {
        // 1. 注入配置和 DOM
        this.config = config;
        this.domElements = domElements;

        // 2. 解构并保存 DOM 元素引用
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

        // 3. (不变)
        this.localizedTonic = config.localizedTonicText || "Tonic";
        this.scaleIntervals = config.scaleIntervals || [0, 2, 4, 5, 7, 9, 11];
        this.fifthsDegreePositions = this.scaleIntervals.map(interval => {
            const index = circleOfFifthsOrder.indexOf(interval);
            return index !== -1 ? index : -99;
        });
        this.keyDefinitions = config.keyDefinitions; // <--- [修改]

        // 4. (不变)
        this.currentStep = config.defaultStep !== undefined ? config.defaultStep : 0;
        this.chromaticVisualAngle = this.currentStep * 30;
        this.fifthsVisualAngle = circleOfFifthsOrder.indexOf(this.currentStep) * 30;
        this.audioPlayer = null;
        this.pianoKeys = [];

        // 5. [修改] 初始化所有 4 个 MusicStaff 控件
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

    createPiano() {
        const piano = document.createElement("ul");
        piano.className = "piano";
        const notesWithOctave = [
            // Octave 1
            "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
            // Octave 2
            "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
        ];

        notesWithOctave.forEach((note) => {
            const li = document.createElement("li");
            const isBlack = note.includes("#");
            li.dataset.note = note;
            li.className = isBlack ? "black" : "white";

            const noteNameSpan = document.createElement("span");
            noteNameSpan.className = "note-name";
            if (!isBlack && !note.includes("2")) {
                noteNameSpan.textContent = note;
            }

            const scaleDegreeSpan = document.createElement("span");
            scaleDegreeSpan.className = "scale-degree";

            li.appendChild(noteNameSpan);
            li.appendChild(scaleDegreeSpan);

            const tonicIndicator = document.createElement("div");
            tonicIndicator.className = "tonic-indicator";

            const tonicText = document.createElement("span");
            tonicText.className = "tonic-text";
            // [重构] 使用 this.localizedTonic
            tonicText.textContent = this.localizedTonic;

            const tonicTriangle = document.createElement("span");
            tonicTriangle.className = "tonic-triangle";
            tonicTriangle.textContent = "▼";

            tonicIndicator.appendChild(tonicText);
            tonicIndicator.appendChild(tonicTriangle);
            li.appendChild(tonicIndicator);

            if (isBlack) {
                piano.lastChild.appendChild(li);
            } else {
                piano.appendChild(li);
            }
        });

        this.pianoContainer.appendChild(piano);
        // [重构] 保存到 this.pianoKeys
        this.pianoKeys = document.querySelectorAll(".piano .white, .piano .black");
    }

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

    updatePianoHighlight() {
        // [重构] 使用 this.pianoKeys
        this.pianoKeys.forEach((key) => {
            key.classList.remove("highlight");
            const tonicEl = key.querySelector(".tonic-indicator");
            if (tonicEl) tonicEl.classList.remove("show");
            const scaleDegreeEl = key.querySelector(".scale-degree");
            if (scaleDegreeEl) scaleDegreeEl.textContent = "";
        });

        // [重构] 使用 this.currentStep
        const rootNoteIndex = this.currentStep;

        // [重构 - 核心] 使用 this.config.scaleIntervals
        this.scaleIntervals.forEach((interval, i) => {
            const noteIndex = (rootNoteIndex + interval) % 12;
            const noteName = notesSharp[noteIndex];
            const needsOctave2 = noteIndex < rootNoteIndex;
            const noteDataName = noteName + (needsOctave2 ? "2" : "");

            const keyElement = document.querySelector(
                `.piano [data-note="${noteDataName}"]`
            );
            if (keyElement) {
                keyElement.classList.add("highlight");
                const scaleDegreeEl = keyElement.querySelector(".scale-degree");
                if (scaleDegreeEl) scaleDegreeEl.textContent = i + 1;
                if (i === 0) {
                    const tonicEl = keyElement.querySelector(".tonic-indicator");
                    if (tonicEl) tonicEl.classList.add("show");
                }
            } else {
                const keyElementFirstOctave = document.querySelector(
                    `.piano [data-note="${noteName}"]`
                );
                if (keyElementFirstOctave) {
                    keyElementFirstOctave.classList.add("highlight");
                    const scaleDegreeEl =
                        keyElementFirstOctave.querySelector(".scale-degree");
                    if (scaleDegreeEl) scaleDegreeEl.textContent = i + 1;
                    if (i === 0) {
                        const tonicEl = keyElementFirstOctave.querySelector(".tonic-indicator");
                        if (tonicEl) tonicEl.classList.add("show");
                    }
                }
            }
        });
    }

    createStaff(clefType) {
        const wrapper = document.createElement("div");
        wrapper.className = "staff-wrapper";
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "staff-line";
            line.style.top = `${i}em`;
            wrapper.appendChild(line);
        }
        const clefPositioner = document.createElement("span");
        clefPositioner.className = "clef";
        clefPositioner.style.top = clefType === "treble" ? "2.7em" : "0.7em";
        clefPositioner.style.left = "5px";
        const clefGlyph = document.createElement("span");
        clefGlyph.textContent = clefType === "treble" ? "\uE050" : "\uE062";
        clefGlyph.style.fontSize = "4em";
        clefPositioner.appendChild(clefGlyph);
        wrapper.appendChild(clefPositioner);
        return wrapper;
    }

    addKeySignature(staffWrapper, clefType, accidentalType, count) {
        if (count === 0) return;
        const positions = ACCIDENTAL_POSITIONS[clefType][accidentalType];
        const symbolText = accidentalType === "sharps" ? "\uE262" : "\uE260";

        for (let i = 0; i < count; i++) {
            const positionerEl = document.createElement("span");
            positionerEl.className = "accidental";
            positionerEl.style.top = `${positions[i]}em`;
            positionerEl.style.left = `${100 + i * 24}px`;
            const glyphEl = document.createElement("span");
            glyphEl.textContent = symbolText;
            glyphEl.style.fontSize = "3.5em";
            positionerEl.appendChild(glyphEl);
            staffWrapper.appendChild(positionerEl);
        }
    }

    updateKeySignatureDisplay() {
        if (!this.trebleStaff) return; // 检查控件是否加载

        // 1. [新逻辑] 直接从配置中获取定义
        const tonic = this.currentStep;
        const definitions = this.keyDefinitions[tonic];

        if (!definitions) {
            // 清空所有
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

        // 2. 检查 'sharp' 定义是否存在
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
            // 如果没有 'sharp' 定义 (例如 F Major), 隐藏主谱表
            this.treblePair.style.display = 'none';
            this.bassPair.style.display = 'none';
            this.trebleStaff.clearAll();
            this.bassStaff.clearAll();
        }

        // 3. 检查 'flat' (同音异调) 定义是否存在
        if (definitions.flat) {
            const def = definitions.flat;
            const pitch = tonicPitches.flat;

            // 决定是显示在主谱表还是同音异调谱表
            const isEnharmonic = (definitions.sharp); // 如果 sharp 也存在, 才是同音异调

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
                // 如果这不是同音异调 (例如 F Major), 确保隐藏同音异调谱表
                this.enhTreblePair.style.display = 'none';
                this.enhBassPair.style.display = 'none';
                this.enhTrebleStaff.clearAll();
                this.enhBassStaff.clearAll();
            }

        } else {
            // 如果没有 'flat' 定义 (例如 C Major), 隐藏同音异调谱表
            this.enhTreblePair.style.display = 'none';
            this.enhBassPair.style.display = 'none';
            this.enhTrebleStaff.clearAll();
            this.enhBassStaff.clearAll();
        }
    }

    updateJianpuDisplay() {
        this.jianpuDisplayContainer.innerHTML = "";

        const definitions = this.keyDefinitions[this.currentStep]; // <--- [修改]
        if (!definitions) return;

        // [修改] 循环遍历 definitions 里的 sharp 和 flat
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
    // =====================================================================

    update() {
        // [重构] 使用 this. 引用
        this.chromaticInnerCircle.style.transform = `translate(-50%, -50%) rotate(${this.chromaticVisualAngle}deg)`;
        this.fifthsInnerCircle.style.transform = `translate(-50%, -50%) rotate(${this.fifthsVisualAngle}deg)`;

        const centerTextElements = document.querySelectorAll(".current-key-display");
        centerTextElements[0].style.transform = `translate(-50%, -50%) rotate(${-this.chromaticVisualAngle}deg)`;
        centerTextElements[1].style.transform = `translate(-50%, -50%) rotate(${-this.fifthsVisualAngle}deg)`;

        document
            .querySelectorAll(".key-name")
            .forEach((display) => (display.textContent = keyDisplayNames[this.currentStep]));

        // [重构] 使用 this. 调用
        this.updatePianoHighlight();
        this.updateKeySignatureDisplay();
        this.updateJianpuDisplay();

        this.keySelectorDropdown.value = this.currentStep;

        if (this.audioPlayer) {
            this.audioPlayer.setKey(this.currentStep);
        }
    }

    // [重构] 新增的事件处理器方法
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
    // =================== 5. 初始化 =======================================
    // =====================================================================

// =====================================================================
    // =================== 5. 初始化 =======================================
    // =====================================================================

    initialize() {
        // 1. [不变] 绘制钢琴
        this.createPiano();

        // 2. [不变] 初始化音频播放器
        this.audioPlayer = new AudioPlayer({
            playStopButton: this.playStopButton,
            songSelector: this.songSelector,
            loopCheckbox: this.loopCheckbox
        });

        // 3. [!! 核心修复 !!] 重构下拉框填充逻辑
        this.keySelectorDropdown.innerHTML = ''; // 清空

        const allKeyOptions = [];

        // 遍历由 major.js 或 minor.js 传入的 keyDefinitions
        for (const tonicKey in this.keyDefinitions) {
            const tonic = parseInt(tonicKey, 10);
            const definitions = this.keyDefinitions[tonic];

            if (definitions.sharp) {
                allKeyOptions.push({
                    name: definitions.sharp.name,
                    value: tonic,
                    // 升号调 (0 到 7)
                    sort: definitions.sharp.signature.count
                });
            }
            if (definitions.flat) {
                // 降号调 (-1 到 -7)
                // 确保我们不重复添加 C Major (0)
                if (!definitions.sharp || definitions.flat.name !== definitions.sharp.name) {
                    allKeyOptions.push({
                        name: definitions.flat.name,
                        value: tonic,
                        sort: -definitions.flat.signature.count
                    });
                }
            }
        }

        // 4. [新] 按调号顺序 (五度圈顺序) 排序
        // 结果: ...F(-1), C(0), G(1), D(2)...
        allKeyOptions.sort((a, b) => a.sort - b.sort);

        // 5. [新] 填充排序后的选项
        allKeyOptions.forEach(key => {
            const option = document.createElement("option");
            option.value = key.value;
            option.textContent = key.name;
            this.keySelectorDropdown.appendChild(option);
        });

        // 6. [不变] 绘制五度圈
        this.createOuterNotes(this.chromaticOuterCircle, [...Array(12).keys()]);
        this.createOuterNotes(this.fifthsOuterCircle, circleOfFifthsOrder);
        this.createInnerDegrees(this.chromaticInnerCircle, this.scaleIntervals);
        this.createInnerDegrees(this.fifthsInnerCircle, this.fifthsDegreePositions);

        // 7. [不变] 绑定事件处理器
        this.chromaticRightBtn.addEventListener("click", this.onChromaticRight.bind(this));
        this.chromaticLeftBtn.addEventListener("click", this.onChromaticLeft.bind(this));
        this.fifthsRightBtn.addEventListener("click", this.onFifthsRight.bind(this));
        this.fifthsLeftBtn.addEventListener("click", this.onFifthsLeft.bind(this));
        this.keySelectorDropdown.addEventListener("change", this.onKeySelectChange.bind(this));

        // 8. [不变] 首次加载
        this.update();
    }
}
