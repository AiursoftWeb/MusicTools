document.addEventListener("DOMContentLoaded", () => {
    // =====================================================================
    // =================== 1. 数据定义 (整合新旧代码) =====================
    // =====================================================================

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
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

    // --- 【移植】用于钢琴键 data-note 匹配的音名数组 ---
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

    // 因为五线谱和钢琴都需要显示调名，所以定义一个专用的显示名称数组
    // 钢琴一共只有 15 个大调。
    // Cb, Gb, Db, Ab, Eb, Bb, F, C, G, D, A, E, B, F#, C#
    const keyDisplayNames = [
        'C',        // 0
        'C♯ / D♭', // 1
        'D',        // 2
        'E♭',       // 3  (移除了 D♯，因为程序只支持 E♭)
        'E',        // 4
        'F',        // 5
        'F♯ / G♭', // 6
        'G',        // 7
        'A♭',       // 8  (移除了 G♯，因为程序只支持 A♭)
        'A',        // 9
        'B♭',       // 10 (移除了 A♯，因为程序只支持 B♭)
        'B / C♭'   // 11 (保持不变，因为 B 和 C♭ 两种记法都支持)
    ];

    // --- 【移植】五线谱调号数据 ---
    const KEY_SIGNATURE_DATA = {
        0: { sharp: { type: 'sharps', count: 0 } }, // C
        7: { sharp: { type: 'sharps', count: 1 } }, // G
        2: { sharp: { type: 'sharps', count: 2 } }, // D
        9: { sharp: { type: 'sharps', count: 3 } }, // A
        4: { sharp: { type: 'sharps', count: 4 } }, // E
        11: { sharp: { type: 'sharps', count: 5 }, flat: { type: 'flats', count: 7 } }, // B/Cb，这是同音异名
        6: { sharp: { type: 'sharps', count: 6 }, flat: { type: 'flats', count: 6 } }, // F#/Gb，这是同音异名
        1: { sharp: { type: 'sharps', count: 7 }, flat: { type: 'flats', count: 5 } }, // C#/Db，这是同音异名
        5: { flat: { type: 'flats', count: 1 } }, // F
        10: { flat: { type: 'flats', count: 2 } }, // Bb
        3: { flat: { type: 'flats', count: 3 } }, // Eb
        8: { flat: { type: 'flats', count: 4 } }, // Ab
    };

    const KEY_SIGNATURE_NAMES = {
        0: { sharp: 'C Major' },
        7: { sharp: 'G Major' },
        2: { sharp: 'D Major' },
        9: { sharp: 'A Major' },
        4: { sharp: 'E Major' },
        11: { sharp: 'B Major', flat: 'C♭ Major' }, // 同音异名
        6: { sharp: 'F♯ Major', flat: 'G♭ Major' }, // 同音异名
        1: { sharp: 'C♯ Major', flat: 'D♭ Major' }, // 同音异名
        5: { flat: 'F Major' },
        10: { flat: 'B♭ Major' },
        3: { flat: 'E♭ Major' },
        8: { flat: 'A♭ Major' }
    };

    const ACCIDENTAL_POSITIONS = {
        treble: {
            // F#, C#, G#, D#, A#, E#, B#
            sharps: [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
            // Bb, Eb, Ab, Db, Gb, Cb, Fb
            flats:  [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
        },
        bass: {
            // F#, C#, G#, D#, A#, E#, B#
            sharps: [1, 2.5, 0.5, 2, 3.5, 1.5, 3],
            // Bb, Eb, Ab, Db, Gb, Cb, Fb
            flats:  [3, 1.5, 3.5, 2, 4, 2.5, 4.5],
        },
    };

    const fifthsMajorScaleDegreePositions = [
        circleOfFifthsOrder.indexOf(0),
        circleOfFifthsOrder.indexOf(2),
        circleOfFifthsOrder.indexOf(4),
        circleOfFifthsOrder.indexOf(5),
        circleOfFifthsOrder.indexOf(7),
        circleOfFifthsOrder.indexOf(9),
        circleOfFifthsOrder.indexOf(11),
    ];

    // --- 全局状态 ---
    let currentStep = 0;
    let chromaticVisualAngle = 0; // 【新增】追踪半音阶圈的视觉角度
    let fifthsVisualAngle = 0;    // 【新增】追踪五度圈的视觉角度
    let localizedTonic = "Tonic"; // <--【!! 新增此行 !!】 (默认值)
    // --- DOM 元素获取 ---
    const chromaticOuterCircle = document.getElementById(
        "chromatic-outer-circle"
    );
    const chromaticInnerCircle = document.getElementById(
        "chromatic-inner-circle"
    );
    const fifthsOuterCircle = document.getElementById("fifths-outer-circle");
    const fifthsInnerCircle = document.getElementById("fifths-inner-circle");
    const chromaticLeftBtn = document.getElementById("chromatic-rotate-left");
    const chromaticRightBtn = document.getElementById("chromatic-rotate-right");
    const fifthsLeftBtn = document.getElementById("fifths-rotate-left");
    const fifthsRightBtn = document.getElementById("fifths-rotate-right");
    const pianoContainer = document.querySelector(".piano-container");
    const keySigContainer = document.getElementById("key-signature-container");
    const keySelectorDropdown = document.getElementById("key-selector-dropdown"); // <--【!! 新增此行 !!】
    const jianpuDisplayContainer = document.getElementById("jianpu-display-container"); // <--【!! 新增此行 !!】
    let pianoKeys = []; // 【修改】先声明，待钢琴创建后再填充

    // =====================================================================
    // =================== 2. 绘制函数 (整合新旧代码) =====================
    // =====================================================================

    // --- 【新增】动态创建钢琴键盘的函数 ---
    function createPiano() {
        const piano = document.createElement("ul");
        piano.className = "piano";
        const notesWithOctave = [
            // Octave 1
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
            // Octave 2
            "C2",
            "C#2",
            "D2",
            "D#2",
            "E2",
            "F2",
            "F#2",
            "G2",
            "G#2",
            "A2",
            "A#2",
            "B2",
        ];

        let whiteKeyIndex = 0;
        notesWithOctave.forEach((note) => {
            const li = document.createElement("li");
            const isBlack = note.includes("#");
            li.dataset.note = note;
            li.className = isBlack ? "black" : "white";

            const noteNameSpan = document.createElement("span");
            noteNameSpan.className = "note-name";
            // 只在第一个八度的白键上显示基础音名 C,D,E...
            if (!isBlack && !note.includes("2")) {
                noteNameSpan.textContent = note;
            }

            const scaleDegreeSpan = document.createElement("span");
            scaleDegreeSpan.className = "scale-degree";

            li.appendChild(noteNameSpan);
            li.appendChild(scaleDegreeSpan);

            // 为每个键创建（隐藏的）主音指示器
            const tonicIndicator = document.createElement("div");
            tonicIndicator.className = "tonic-indicator";

            const tonicText = document.createElement("span");
            tonicText.className = "tonic-text";
            tonicText.textContent = localizedTonic; // <-- 使用我们加载的字符串

            const tonicTriangle = document.createElement("span");
            tonicTriangle.className = "tonic-triangle";
            tonicTriangle.textContent = "▼"; // 倒三角

            tonicIndicator.appendChild(tonicText);
            tonicIndicator.appendChild(tonicTriangle);
            li.appendChild(tonicIndicator);

            // 黑键需要插入到前一个白键中
            if (isBlack) {
                piano.lastChild.appendChild(li);
            } else {
                piano.appendChild(li);
            }
        });

        pianoContainer.appendChild(piano);
        // 钢琴创建完毕后，再获取所有的琴键
        pianoKeys = document.querySelectorAll(".piano .white, .piano .black");
    }

    function createOuterNotes(parentCircle, orderArray) {
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

    function createInnerDegrees(parentCircle, positionsArray) {
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

    // --- 【移植】高亮钢琴键的函数 ---
    function updatePianoHighlight() {
        pianoKeys.forEach((key) => {
            key.classList.remove("highlight");

            const tonicEl = key.querySelector(".tonic-indicator");
            if (tonicEl) tonicEl.classList.remove("show");

            const scaleDegreeEl = key.querySelector(".scale-degree");
            if (scaleDegreeEl) scaleDegreeEl.textContent = "";
        });

        const rootNoteIndex = currentStep;
        majorScaleIntervals.forEach((interval, i) => {
            const noteIndex = (rootNoteIndex + interval) % 12;
            const noteName = notesSharp[noteIndex];

            // 旧代码中的八度逻辑，用来处理跨八度的音，例如B大调包含C#2和D#2
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
                // 如果在第二个八度找不到（例如C大调的B），就尝试在第一个八度找
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

    // --- 【移植】五线谱绘制相关函数 ---
// script.js
// 修改后的 createStaff 函数
    function createStaff(clefType) {
        const wrapper = document.createElement("div");
        wrapper.className = "staff-wrapper";
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "staff-line";
            line.style.top = `${i}em`;
            wrapper.appendChild(line);
        }

        // --- 开始修改 ---
        // 1. 创建外层 span 用于定位谱号
        const clefPositioner = document.createElement("span");
        clefPositioner.className = "clef";
        clefPositioner.style.top = clefType === "treble" ? "2.7em" : "0.7em";
        clefPositioner.style.left = "5px";

        // 2. 创建内层 span 用于显示和缩放谱号
        const clefGlyph = document.createElement("span");
        clefGlyph.textContent = clefType === "treble" ? "\uE050" : "\uE062";
        clefGlyph.style.fontSize = "4em"; // 谱号的字体大小

        // 3. 组装
        clefPositioner.appendChild(clefGlyph);
        wrapper.appendChild(clefPositioner);
        // --- 结束修改 ---

        return wrapper;
    }

// 修改后的 addKeySignature 函数
    function addKeySignature(staffWrapper, clefType, accidentalType, count) {
        if (count === 0) return;
        const positions = ACCIDENTAL_POSITIONS[clefType][accidentalType];
        const symbolText = accidentalType === "sharps" ? "\uE262" : "\uE260";

        for (let i = 0; i < count; i++) {
            // 1. 创建外层 span 用于定位
            const positionerEl = document.createElement("span");
            positionerEl.className = "accidental"; // 应用 .accidental 的 position, font-family 等
            positionerEl.style.top = `${positions[i]}em`;
            positionerEl.style.left = `${100 + i * 24}px`;

            // 2. 创建内层 span 用于显示和缩放符号
            const glyphEl = document.createElement("span");
            glyphEl.textContent = symbolText;
            glyphEl.style.fontSize = "3.5em";
            // 注意：这里的 2.5em 会继承外层元素的 font-size (30px)，
            // 但由于定位是在外层完成的，所以不会影响 top 的计算。

            // 3. 组装：将内层放入外层，再将外层放入五线谱
            positionerEl.appendChild(glyphEl);
            staffWrapper.appendChild(positionerEl);
        }
    }
    function updateKeySignatureDisplay() {
        keySigContainer.innerHTML = "";
        const signatures = KEY_SIGNATURE_DATA[currentStep];
        const names = KEY_SIGNATURE_NAMES[currentStep];

        if (!signatures || !names) return;

        Object.entries(signatures).forEach(([keyType, sig]) => {
            if (sig) {
                // 1. 为每一对高低音谱号创建一个包裹容器
                const pairContainer = document.createElement("div");
                pairContainer.className = "key-signature-pair";

                // 2. 查找对应的调名
                const keyName = names[keyType]; // 例如 "C♯ Major" 或 "D♭ Major"

                if (keyName) {
                    // 3. 创建并附加调名标签
                    const label = document.createElement("div");
                    // 【修改】使用 mb-2 (margin-bottom) 来在标签 *下方* 添加间距
                    label.className = "key-signature-label text-center text-muted fw-bold mb-2";
                    label.textContent = keyName;

                    // 【修改】将标签 *首先* 附加到容器中
                    pairContainer.appendChild(label);
                }
                // =====================================================================


                // 4. 创建高音和低音谱号 (现在在标签之后附加)
                const trebleStaff = createStaff("treble");
                addKeySignature(trebleStaff, "treble", sig.type, sig.count);
                pairContainer.appendChild(trebleStaff);

                const bassStaff = createStaff("bass");
                addKeySignature(bassStaff, "bass", sig.type, sig.count);
                pairContainer.appendChild(bassStaff);

                // 5. 将完整的 "谱组" 容器添加到主容器中
                keySigContainer.appendChild(pairContainer);
            }
        });
    }

    function updateJianpuDisplay() {
        // 1. 清空旧内容
        jianpuDisplayContainer.innerHTML = "";

        // 2. 从我们已有的数据中获取调名
        const names = KEY_SIGNATURE_NAMES[currentStep];
        if (!names) return;

        // 3. 循环所有可能的调名 (例如 "C♯ Major" 和 "D♭ Major")
        Object.values(names).forEach(fullName => {
            // 4. 从 "C♯ Major" 中提取 "C♯"
            const keyName = fullName.split(' ')[0];
            const jianpuText = `1 = ${keyName}`;

            // 5. 创建 <p> 元素并显示
            const p = document.createElement("p");
            // 使用 Bootstrap 样式让它看起来更醒目
            p.className = "h4 fw-bold mb-1";
            p.textContent = jianpuText;
            jianpuDisplayContainer.appendChild(p);
        });
    }
    // =====================================================================
    // =================== 3. 主更新与事件处理 ===========================
    // =====================================================================
    function update() {
        // 【修改】直接应用视觉角度变量，不再进行计算
        chromaticInnerCircle.style.transform = `translate(-50%, -50%) rotate(${chromaticVisualAngle}deg)`;
        fifthsInnerCircle.style.transform = `translate(-50%, -50%) rotate(${fifthsVisualAngle}deg)`;

        const centerTextElements = document.querySelectorAll(".current-key-display");
        centerTextElements[0].style.transform = `translate(-50%, -50%) rotate(${-chromaticVisualAngle}deg)`;
        centerTextElements[1].style.transform = `translate(-50%, -50%) rotate(${-fifthsVisualAngle}deg)`;

        document
            .querySelectorAll(".key-name")
            .forEach((display) => (display.textContent = keyDisplayNames[currentStep]));

        updatePianoHighlight();
        updateKeySignatureDisplay();
        updateJianpuDisplay();
        keySelectorDropdown.value = currentStep;
    }

    // --- 事件处理 (无需改动) ---
// --- 【修改】重写事件处理，以控制动画方向并保持同步 ---
    chromaticRightBtn.addEventListener("click", () => {
        currentStep = (currentStep + 1) % 12;
        chromaticVisualAngle += 30; // 累加角度
        // 同步更新五度圈的角度
        fifthsVisualAngle = circleOfFifthsOrder.indexOf(currentStep) * 30;
        update();
    });

    chromaticLeftBtn.addEventListener("click", () => {
        currentStep = (currentStep - 1 + 12) % 12;
        chromaticVisualAngle -= 30; // 累减角度
        // 同步更新五度圈的角度
        fifthsVisualAngle = circleOfFifthsOrder.indexOf(currentStep) * 30;
        update();
    });

    fifthsRightBtn.addEventListener("click", () => {
        currentStep = (currentStep + 7) % 12;
        fifthsVisualAngle += 30; // 累加角度
        // 同步更新半音阶圈的角度
        chromaticVisualAngle = currentStep * 30;
        update();
    });

    fifthsLeftBtn.addEventListener("click", () => {
        currentStep = (currentStep - 7 + 12) % 12;
        fifthsVisualAngle -= 30; // 累减角度
        // 同步更新半音阶圈的角度
        chromaticVisualAngle = currentStep * 30;
        update();
    });

    keySelectorDropdown.addEventListener("change", () => {
        const newStep = parseInt(keySelectorDropdown.value, 10);

        if (newStep === currentStep) return;

        currentStep = newStep;

        chromaticVisualAngle = currentStep * 30;
        fifthsVisualAngle = circleOfFifthsOrder.indexOf(currentStep) * 30;

        update(); // 调用主更新函数
    });

    // =====================================================================
    // =================== 4. 初始化 =======================================
    // =====================================================================
    function initialize() {
        const localeData = document.getElementById("localization-data");
        if (localeData && localeData.dataset.tonic) {
            localizedTonic = localeData.dataset.tonic;
        }
        // --- 【调用】先创建钢琴, 再执行其他 ---
        createPiano();

        keyDisplayNames.forEach((keyName, index) => {
            const option = document.createElement("option");
            option.value = index; // 值为 0, 1, 2...
            option.textContent = keyName; // 文本为 'C', 'C♯ / D♭'...
            keySelectorDropdown.appendChild(option);
        });

        createOuterNotes(chromaticOuterCircle, [...Array(12).keys()]);
        createOuterNotes(fifthsOuterCircle, circleOfFifthsOrder);

        createInnerDegrees(chromaticInnerCircle, majorScaleIntervals);
        createInnerDegrees(fifthsInnerCircle, fifthsMajorScaleDegreePositions);

        update(); // 首次加载时更新所有视图
    }

    initialize();
});
