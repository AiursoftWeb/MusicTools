// =====================================================================
// =================== 1. 通用数据定义 ================================
// =====================================================================
// (从 major.js 迁移而来)
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
        this.keySigContainer = domElements.keySigContainer;
        this.keySelectorDropdown = domElements.keySelectorDropdown;
        this.jianpuDisplayContainer = domElements.jianpuDisplayContainer;
        this.playStopButton = domElements.playStopButton;
        this.songSelector = domElements.songSelector;
        this.loopCheckbox = domElements.loopCheckbox;

        // 3. 从配置中提取本地化文本
        this.localizedTonic = config.localizedTonicText || "Tonic";

        // 3.5 从配置中获取音阶间隔并派生五度圈位置
        this.scaleIntervals = config.scaleIntervals || [0, 2, 4, 5, 7, 9, 11]; // (默认值以防万一)

        // 自动派生五度圈音级位置
        this.fifthsDegreePositions = this.scaleIntervals.map(interval => {
            // circleOfFifthsOrder 是在文件顶部定义的全局常量
            const index = circleOfFifthsOrder.indexOf(interval);
            // 如果找不到(例如在非自然音阶中)，返回-1，使其不显示
            return index !== -1 ? index : -99;
        });

        // 4. 初始化内部状态
        this.currentStep = 0;
        this.chromaticVisualAngle = 0;
        this.fifthsVisualAngle = 0;
        this.audioPlayer = null;
        this.pianoKeys = [];
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
        // [重构] 使用 this.keySigContainer
        this.keySigContainer.innerHTML = "";
        const signatures = KEY_SIGNATURE_DATA[this.currentStep];

        // [重构 - 核心] 使用 this.config.keySignatureNames
        const names = this.config.keySignatureNames[this.currentStep];

        if (!signatures || !names) return;

        Object.entries(signatures).forEach(([keyType, sig]) => {
            if (sig) {
                const pairContainer = document.createElement("div");
                pairContainer.className = "key-signature-pair";
                const keyName = names[keyType];
                if (keyName) {
                    const label = document.createElement("div");
                    label.className = "key-signature-label text-center text-muted fw-bold mb-2";
                    label.textContent = keyName;
                    pairContainer.appendChild(label);
                }
                const trebleStaff = this.createStaff("treble");
                this.addKeySignature(trebleStaff, "treble", sig.type, sig.count);
                pairContainer.appendChild(trebleStaff);

                const bassStaff = this.createStaff("bass");
                this.addKeySignature(bassStaff, "bass", sig.type, sig.count);
                pairContainer.appendChild(bassStaff);

                this.keySigContainer.appendChild(pairContainer);
            }
        });
    }

    updateJianpuDisplay() {
        // [重构] 使用 this.jianpuDisplayContainer
        this.jianpuDisplayContainer.innerHTML = "";

        // [重构 - 核心] 使用 this.config.keySignatureNames
        const names = this.config.keySignatureNames[this.currentStep];
        if (!names) return;

        Object.values(names).forEach(fullName => {
            const keyName = fullName.split(' ')[0];

            // [重构 - 核心] 使用 this.config.jianpuPrefix
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

    initialize() {
        // [重构] 不再从此

        // [重构] 使用 this. 调用
        this.createPiano();

        // [重构] 使用 this. 引用
        this.audioPlayer = new AudioPlayer({
            playStopButton: this.playStopButton,
            songSelector: this.songSelector,
            loopCheckbox: this.loopCheckbox
        });

        // [重构] 使用 this.keySelectorDropdown
        keyDisplayNames.forEach((keyName, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = keyName;
            this.keySelectorDropdown.appendChild(option);
        });

        // [重构] 使用 this. 调用
        this.createOuterNotes(this.chromaticOuterCircle, [...Array(12).keys()]);
        this.createOuterNotes(this.fifthsOuterCircle, circleOfFifthsOrder);

        // [重构 - 核心] 使用 this.config 传参
        // this.createInnerDegrees(this.chromaticInnerCircle, this.config.scaleIntervals);
        // this.createInnerDegrees(this.fifthsInnerCircle, this.config.fifthsDegreePositions);
        // [重构 - 核心] 使用派生出的类属性传参
        this.createInnerDegrees(this.chromaticInnerCircle, this.scaleIntervals);
        this.createInnerDegrees(this.fifthsInnerCircle, this.fifthsDegreePositions);

        // [重构] 绑定事件处理器
        this.chromaticRightBtn.addEventListener("click", this.onChromaticRight.bind(this));
        this.chromaticLeftBtn.addEventListener("click", this.onChromaticLeft.bind(this));
        this.fifthsRightBtn.addEventListener("click", this.onFifthsRight.bind(this));
        this.fifthsLeftBtn.addEventListener("click", this.onFifthsLeft.bind(this));
        this.keySelectorDropdown.addEventListener("change", this.onKeySelectChange.bind(this));

        this.update(); // 首次加载时更新所有视图
    }
}
