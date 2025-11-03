// 钢琴键盘的 "data-note" 使用的是升号 (#)
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// 乐理上 "小" 和 "减" 音程倾向于使用降号 (b)
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

window.addEventListener("load", () => {
    // =====================================================================
    // =================== 1. DOM 和本地化 ==============================
    // =====================================================================

    // (A) 获取 DOM 元素
    const pianoContainer = document.querySelector(".piano-container");
    const interval1El = document.getElementById('interval-1');
    const interval2El = document.getElementById('interval-2');
    const intervalResultEl = document.getElementById('interval-result');
    const resetBtn = document.getElementById('reset-interval-btn'); // <-- !! 添加这一行

    // (B) 从 HTML data-* 属性中获取所有本地化字符串
    const localeData = document.getElementById("localization-data");
    const localizedStrings = {
        perfectUnison: localeData.dataset.perfectUnison,
        minorSecond: localeData.dataset.minorSecond,
        majorSecond: localeData.dataset.majorSecond,
        minorThird: localeData.dataset.minorThird,
        majorThird: localeData.dataset.majorThird,
        perfectFourth: localeData.dataset.perfectFourth,
        augmentedFourth: localeData.dataset.augmentedFourth,
        perfectFifth: localeData.dataset.perfectFifth,
        minorSixth: localeData.dataset.minorSixth,
        majorSixth: localeData.dataset.majorSixth,
        minorSeventh: localeData.dataset.minorSeventh,
        majorSeventh: localeData.dataset.majorSeventh,

        perfectOctave: localeData.dataset.perfectOctave,
        minorNinth: localeData.dataset.minorNinth,
        majorNinth: localeData.dataset.majorNinth,
        minorTenth: localeData.dataset.minorTenth,
        majorTenth: localeData.dataset.majorTenth,
        perfectEleventh: localeData.dataset.perfectEleventh,
        augmentedEleventh: localeData.dataset.augmentedEleventh,
        perfectTwelfth: localeData.dataset.perfectTwelfth,
        minorThirteenth: localeData.dataset.minorThirteenth,
        majorThirteenth: localeData.dataset.majorThirteenth,
        minorFourteenth: localeData.dataset.minorFourteenth,
        majorFourteenth: localeData.dataset.majorFourteenth,

        perfectFifteenth: localeData.dataset.perfectFifteenth,
        minorSixteenth: localeData.dataset.minorSixteenth,
        majorSixteenth: localeData.dataset.majorSixteenth,
        minorSeventeenth: localeData.dataset.minorSeventeenth,
        majorSeventeenth: localeData.dataset.majorSeventeenth,
        perfectEighteenth: localeData.dataset.perfectEighteenth,
        augmentedEighteenth: localeData.dataset.augmentedEighteenth,
        perfectNineteenth: localeData.dataset.perfectNineteenth,
        minorTwentieth: localeData.dataset.minorTwentieth,
        majorTwentieth: localeData.dataset.majorTwentieth,
        minorTwentyFirst: localeData.dataset.minorTwentyFirst,
        majorTwentyFirst: localeData.dataset.majorTwentyFirst,
        perfectTwentySecond: localeData.dataset.perfectTwentySecond,

        // --- 错误和状态 ---
        unableToRecognizeNoteName: localeData.dataset.unableToRecognizeNoteName,
        pleaseIputWithTheLowerNoteFirst: localeData.dataset.pleaseIputWithTheLowerNoteFirst
    };

    // =====================================================================
    // =================== 2. 贡献者的功能逻辑 ===========================
    // =====================================================================
    // (以下 2 个函数直接从 dvorak 的 minor.js PR 中复制而来)

    const HIGH_LIGHT = 'select-highlight';

    /**
     * 核心算法 (已升级，支持智能音符拼写)
     */
    function calculateInterval(note1, note2) {
        // --- 1. 定义音高和音程数据 ---

        // 钢琴 (data-note) 使用的音名 -> 半音值
        const BASE_NOTES = {
            "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
            "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
        };

        // 智能音程图:
        // 'type' 告诉我们这个音程倾向于使用 'sharp' 还是 'flat' 拼写
        const INTERVAL_MAP = {
            0: { name: localizedStrings.perfectUnison, type: 'sharp' },
            1: { name: localizedStrings.minorSecond, type: 'flat' },
            2: { name: localizedStrings.majorSecond, type: 'sharp' },
            3: { name: localizedStrings.minorThird, type: 'flat' },
            4: { name: localizedStrings.majorThird, type: 'sharp' },
            5: { name: localizedStrings.perfectFourth, type: 'sharp' },
            6: { name: localizedStrings.augmentedFourth, type: 'sharp' }, // C-F# (增四) vs C-Gb (减五)
            7: { name: localizedStrings.perfectFifth, type: 'sharp' },
            8: { name: localizedStrings.minorSixth, type: 'flat' },
            9: { name: localizedStrings.majorSixth, type: 'sharp' },
            10: { name: localizedStrings.minorSeventh, type: 'flat' },
            11: { name: localizedStrings.majorSeventh, type: 'sharp' },

            12: { name: localizedStrings.perfectOctave, type: 'sharp' },
            13: { name: localizedStrings.minorNinth, type: 'flat' },
            14: { name: localizedStrings.majorNinth, type: 'sharp' },
            15: { name: localizedStrings.minorTenth, type: 'flat' },
            16: { name: localizedStrings.majorTenth, type: 'sharp' },
            17: { name: localizedStrings.perfectEleventh, type: 'sharp' },
            18: { name: localizedStrings.augmentedEleventh, type: 'sharp' },
            19: { name: localizedStrings.perfectTwelfth, type: 'sharp' },
            20: { name: localizedStrings.minorThirteenth, type: 'flat' },
            21: { name: localizedStrings.majorThirteenth, type: 'sharp' },
            22: { name: localizedStrings.minorFourteenth, type: 'flat' },
            23: { name: localizedStrings.majorFourteenth, type: 'sharp' },

            24: { name: localizedStrings.perfectFifteenth, type: 'sharp' },
            25: { name: localizedStrings.minorSixteenth, type: 'flat' },
            26: { name: localizedStrings.majorSixteenth, type: 'sharp' },
            27: { name: localizedStrings.minorSeventeenth, type: 'flat' },
            28: { name: localizedStrings.majorSeventeenth, type: 'sharp' },
            29: { name: localizedStrings.perfectEighteenth, type: 'sharp' },
            30: { name: localizedStrings.augmentedEighteenth, type: 'sharp' },
            31: { name: localizedStrings.perfectNineteenth, type: 'sharp' },
            32: { name: localizedStrings.minorTwentieth, type: 'flat' },
            33: { name: localizedStrings.majorTwentieth, type: 'sharp' },
            34: { name: localizedStrings.minorTwentyFirst, type: 'flat' },
            35: { name: localizedStrings.majorTwentyFirst, type: 'sharp' },
            36: { name: localizedStrings.perfectTwentySecond, type: 'sharp' }
        };

        // --- 2. 辅助函数: 解析音符 ---
        function parseNote(note) {
            let octave = 1;
            let noteName = note;
            const match = note.match(/(\d+)$/);
            if (match) {
                octave = parseInt(match[1], 10);
                noteName = note.slice(0, -match[1].length);
            }
            const baseValue = BASE_NOTES[noteName];
            if (baseValue === undefined) {
                throw new Error(`${localizedStrings.unableToRecognizeNoteName}: ${noteName}`);
            }
            // 绝对半音值 (例如 C1 = 12, G#1 = 20)
            const absoluteValue = baseValue + octave * 12;
            return { noteName, octave, baseValue, absoluteValue };
        }

        // --- 3. 主计算逻辑 ---
        try {
            const parsedNote1 = parseNote(note1);
            const parsedNote2 = parseNote(note2);

            // 确定哪个是根音 (音高更低的)
            let rootParsed, targetParsed;
            if (parsedNote1.absoluteValue <= parsedNote2.absoluteValue) {
                rootParsed = parsedNote1;
                targetParsed = parsedNote2;
            } else {
                rootParsed = parsedNote2;
                targetParsed = parsedNote1;
            }

            const semitones = targetParsed.absoluteValue - rootParsed.absoluteValue;

            const intervalInfo = INTERVAL_MAP[semitones];

            if (!intervalInfo) {
                const errName = `@Localizer["Beyond Map"] (${semitones} @Localizer["semitones"])`;
                return { note1: note1, note2: note2, intervalName: errName };
            }

            // --- 4. 智能拼写计算 ---

            // 目标音符的半音索引 (0-11)
            const targetBaseValue = targetParsed.baseValue;

            let targetSpellingName;

            // 根据音程类型，选择 'sharp' 还是 'flat' 拼写
            if (intervalInfo.type === 'flat') {
                targetSpellingName = FLAT_NAMES[targetBaseValue];
            } else {
                // 'sharp' 或 'natural' (C, D, E... 在两个数组中都一样)
                targetSpellingName = SHARP_NAMES[targetBaseValue];
            }

            // 组装最终的拼写
            const rootDisplay = rootParsed.noteName + rootParsed.octave;
            const targetDisplay = targetSpellingName + targetParsed.octave;

            return {
                note1: rootDisplay,
                note2: targetDisplay,
                intervalName: intervalInfo.name
            };

        } catch (e) {
            return { note1: note1, note2: note2, intervalName: `Error: ${e.message}` };
        }
    }

    /**
     * 事件处理器 (已更新, 以处理 calculateInterval 返回的对象)
     */
    function setupIntervalCalculator(container) {
        let firstNote = '', secondNote = '';

        function resetSelection() {
            firstNote = '';
            secondNote = '';

            // 清空 UI
            intervalResultEl.innerText = '';
            interval1El.innerText = '--';
            interval2El.innerText = '--';

            // 移除所有高亮
            container.querySelectorAll('[data-note]').forEach(t => {
                t.classList.remove(HIGH_LIGHT);
            });
        }

        // 绑定重置按钮事件
        container.addEventListener('click', (ev) => {
            const targetKey = ev.target.closest('[data-note]');
            if (!targetKey) return;

            const note = targetKey.dataset['note'];

            if (!firstNote) {
                firstNote = note;
            } else if (!secondNote) {
                secondNote = note;
            } else if (firstNote === note) {
                firstNote = secondNote;
                secondNote = '';
            } else if (secondNote === note) {
                secondNote = '';
            } else {
                firstNote = secondNote;
                secondNote = note;
            }

            container.querySelectorAll('[data-note]').forEach(t => {
                t.classList.remove(HIGH_LIGHT);
            });

            if (firstNote) {
                container.querySelector(`[data-note="${firstNote}"]`).classList.add(HIGH_LIGHT);
            }
            if (secondNote) {
                container.querySelector(`[data-note="${secondNote}"]`).classList.add(HIGH_LIGHT);
            }

            // --- [修改] 更新 UI 的方式 ---
            if (firstNote && secondNote) {
                // 1. 计算结果
                const result = calculateInterval(firstNote, secondNote);

                // 2. 将智能拼写的结果更新到 UI
                intervalResultEl.innerText = result.intervalName;
                interval1El.innerText = result.note1;
                interval2El.innerText = result.note2;

            } else {
                // 清空 UI
                intervalResultEl.innerText = '';
                interval1El.innerText = firstNote || '--';
                interval2El.innerText = secondNote || '--';
            }
        });

        resetBtn.addEventListener('click', resetSelection);
    }
    // =====================================================================
    // =================== 3. 精简版 createPiano ========================
    // =====================================================================
    // (从 dvorak 的 major.js PR 中提取, 但清除了所有不相关的逻辑)

// =====================================================================
    // =================== 3. 精简版 createPiano ========================
    // =====================================================================
    // (从 dvorak 的 major.js PR 中提取, 但清除了所有不相关的逻辑)

    function createSimplePiano(container) {
        const piano = document.createElement("ul");
        piano.className = "piano";

        // [修改] 扩展到 3 个八度 (C1 到 C4) 以支持二十度音程
        const notesWithOctave = [
            "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
            "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
            "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
            "C4" // 额外加一个C4, 总共 37 键 (36 个半音)
        ];

        notesWithOctave.forEach((note) => {
            const li = document.createElement("li");
            const isBlack = note.includes("#");
            li.dataset.note = note; // 关键: "C1", "C#1" 等
            li.className = isBlack ? "black" : "white";

            const noteNameSpan = document.createElement("span");
            noteNameSpan.className = "note-name";

            // 在所有白键上显示音名
            if (!isBlack) {
                noteNameSpan.textContent = note.slice(0, -1); // "C", "D", "E"...
            }

            li.appendChild(noteNameSpan);

            // (已移除: ScaleDegree 和 TonicIndicator 的逻辑)

            if (isBlack) {
                piano.lastChild.appendChild(li);
            } else {
                piano.appendChild(li);
            }
        });

        container.appendChild(piano);
    }
    // =====================================================================
    // =================== 4. 启动! =====================================
    // =====================================================================

    createSimplePiano(pianoContainer);
    setupIntervalCalculator(pianoContainer);

});
