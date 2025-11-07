// 钢琴键盘的 "data-note" 使用的是升号 (#)
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// 乐理上 "小" 和 "减" 音程倾向于使用降号 (b)
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

window.addEventListener("load", () => {
    // =====================================================================
    // =================== 1. DOM 和本地化 ==============================
    // =====================================================================
    console.log("[Init] interval.js loading...");

    // (A) 获取 DOM 元素
    const pianoContainer = document.querySelector(".piano-container");
    const interval1El = document.getElementById('interval-1');
    const interval2El = document.getElementById('interval-2');
    const intervalResultEl = document.getElementById('interval-result');
    const resetBtn = document.getElementById('reset-interval-btn');
    const intervalRatioEl = document.getElementById('interval-ratio');
    const intervalErrorEl = document.getElementById('interval-error');

    // (B) [!! 修复 !!] 确保你使用的是唯一的 ID，例如 "calc-localization-data"
    let localeData = document.getElementById("calc-localization-data"); // <-- 假设你已修复了 HTML 中的 ID
    if (!localeData) {
        // 如果 HTML 没改，尝试回退到旧 ID
        localeData = document.getElementById("localization-data");
        console.warn("[Init] Warning: Found fallback 'localization-data'. Please update HTML to 'calc-localization-data' to avoid ID conflicts.");
        if(!localeData) {
            console.error("CRITICAL: localization-data element not found. Stopping script.");
            return;
        }
    }

    // (C) 获取本地化字符串
    const localizedStrings = {
        // ... (所有字符串... )
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
        unableToRecognizeNoteName: localeData.dataset.unableToRecognizeNoteName,
        pleaseIputWithTheLowerNoteFirst: localeData.dataset.pleaseIputWithTheLowerNoteFirst
    };
    console.log("[Init] Localization strings loaded.");

    // =====================================================================
    // =================== 2. 核心功能逻辑 ===============================
    // =====================================================================

    const HIGH_LIGHT = 'select-highlight';
    const MILU_SEARCH_LIMIT = 200; // [新] 密率搜索上限 (你提到的 160 就够了)

    function calculateErrorInCents(tetRatio, rationalRatio) {
        if (!tetRatio || !rationalRatio) return 0;
        const cents = 1200 * Math.log2(tetRatio / rationalRatio);
        console.log(`[Debug Cents] 12TET: ${tetRatio}, Rational: ${rationalRatio}, Cents: ${cents}`);
        return cents;
    }

    // [!! 修改 !!] 移除了 'maxInt' 的硬编码默认值
    function findBestRational(ratio, maxInt) {
        console.log(`[Debug Approx] Finding best rational for ${ratio} with maxInt ${maxInt}`);
        let best = { n: 1, d: 1, error: Math.abs(ratio - 1) };

        for (let d = 1; d <= maxInt; d++) {
            const candidates = [Math.floor(ratio * d), Math.ceil(ratio * d)];
            for (const n of candidates) {
                if (n === 0 || n > maxInt || n < 1) continue;
                const r = n / d;
                const error = Math.abs(ratio - r);
                if (error < best.error) {
                    best = { n: n, d: d, error: error };
                    console.log(`[Debug Approx] New best: ${n}:${d}, Error: ${error}`);
                }
            }
        }
        function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
        const commonDivisor = gcd(best.n, best.d);
        if (commonDivisor > 1) {
            console.log(`[Debug Approx] Simplifying ${best.n}:${best.d} -> ${best.n / commonDivisor}:${best.d / commonDivisor}`);
            best.n /= commonDivisor;
            best.d /= commonDivisor;
        }
        return best;
    }


    /**
     * [!! 核心重构 !!]
     * 核心算法。现在自动计算 'yuelu' 和 'milu'
     */
    function calculateInterval(note1, note2) {

        // --- 1. 定义音高和音程数据 ---
        // ... (BASE_NOTES 和 INTERVAL_MAP 不变) ...
        const BASE_NOTES = {
            "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
            "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
        };
        const INTERVAL_MAP = {
            0: { name: localizedStrings.perfectUnison, type: 'sharp' },
            1: { name: localizedStrings.minorSecond, type: 'flat' },
            2: { name: localizedStrings.majorSecond, type: 'sharp' },
            3: { name: localizedStrings.minorThird, type: 'flat' },
            4: { name: localizedStrings.majorThird, type: 'sharp' },
            5: { name: localizedStrings.perfectFourth, type: 'sharp' },
            6: { name: localizedStrings.augmentedFourth, type: 'sharp' },
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

        // --- 2. 辅助函数: 解析音符 (不变) ---
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
            const absoluteValue = baseValue + octave * 12;
            return { noteName, octave, baseValue, absoluteValue };
        }

        // --- 3. 主计算逻辑 ---
        try {
            const parsedNote1 = parseNote(note1);
            const parsedNote2 = parseNote(note2);

            let rootParsed, targetParsed;
            if (parsedNote1.absoluteValue <= parsedNote2.absoluteValue) {
                rootParsed = parsedNote1;
                targetParsed = parsedNote2;
            } else {
                rootParsed = parsedNote2;
                targetParsed = parsedNote1;
            }

            console.log(`[Debug Calc] Root: ${rootParsed.noteName}${rootParsed.octave} (Abs: ${rootParsed.absoluteValue}), Target: ${targetParsed.noteName}${targetParsed.octave} (Abs: ${targetParsed.absoluteValue})`);

            // --- 4. 12-TET 和 有理数逼近 ---
            const semitones = targetParsed.absoluteValue - rootParsed.absoluteValue;
            const tetRatio = Math.pow(2, semitones / 12);

            // [!! 新逻辑 !!] 计算 "约率"
            const yuelu = findBestRational(tetRatio, 10); // 10 以内
            const yueluErrorCents = calculateErrorInCents(tetRatio, (yuelu.n / yuelu.d));

            // [!! 新逻辑 !!] 循环查找 "密率"
            let milu = yuelu;
            for (let maxInt = 11; maxInt <= MILU_SEARCH_LIMIT; maxInt++) {
                const currentApprox = findBestRational(tetRatio, maxInt);
                // 如果找到了一个 *不同* (且更精确) 的比值
                if (currentApprox.n !== yuelu.n || currentApprox.d !== yuelu.d) {
                    milu = currentApprox;
                    console.log(`[Debug Milu] Found Milü at maxInt=${maxInt} -> ${milu.n}:${milu.d}`);
                    break; // 找到了，停止搜索
                }
            }
            const miluErrorCents = calculateErrorInCents(tetRatio, (milu.n / milu.d));


            console.log(`[Debug Calc] Semitones: ${semitones}, 12-TET Ratio: ${tetRatio}`);

            // --- 5. 乐理拼写 (不变) ---
            const intervalInfo = INTERVAL_MAP[semitones];
            if (!intervalInfo) {
                const errName = `Interval too large (${semitones} semitones)`;
                console.warn(`[Debug Calc] ${errName}`);
                return {
                    note1: rootParsed.noteName + rootParsed.octave,
                    note2: targetParsed.noteName + targetParsed.octave,
                    intervalName: errName,
                    yuelu: yuelu, // 即使没有名字，也返回比值
                    yueluErrorCents: yueluErrorCents,
                    milu: milu,
                    miluErrorCents: miluErrorCents
                };
            }

            const targetBaseValue = targetParsed.baseValue;
            let targetSpellingName;
            if (intervalInfo.type === 'flat') {
                targetSpellingName = FLAT_NAMES[targetBaseValue];
            } else {
                targetSpellingName = SHARP_NAMES[targetBaseValue];
            }
            const rootDisplay = rootParsed.noteName + rootParsed.octave;
            const targetDisplay = targetSpellingName + targetParsed.octave;

            // --- 6. [!! 修改 !!] 返回新的比值对象 ---
            return {
                note1: rootDisplay,
                note2: targetDisplay,
                intervalName: intervalInfo.name,
                yuelu: yuelu, // { n: 4, d: 3, error: ... }
                yueluErrorCents: yueluErrorCents,
                milu: milu, // { n: 159, d: 119, error: ... }
                miluErrorCents: miluErrorCents
            };

        } catch (e) {
            console.error(`[Debug Calc] Error: ${e.message}`);
            return { note1: note1, note2: note2, intervalName: `Error: ${e.message}` };
        }
    }

    /**
     * [!! 重构 !!]
     * 事件处理器，显示 Yuelu 和 Milu
     */
    function setupIntervalCalculator(container) {
        let firstNote = '', secondNote = '';
        console.log("[Init] Setting up Interval Calculator...");

        // [!! 修改 !!] 移除 input 相关的逻辑，重构 updateDisplay
        function updateDisplay() {
            if (firstNote && secondNote) {

                console.log(`[Debug UI] Calculating interval for ${firstNote} and ${secondNote}`);
                // [!! 修改 !!] 不再需要传入 'precision'
                const result = calculateInterval(firstNote, secondNote);

                intervalResultEl.innerText = result.intervalName;
                interval1El.innerText = result.note1;
                interval2El.innerText = result.note2;

                // [!! 新的显示逻辑 !!]
                if (result.yuelu) {
                    const cents = result.yueluErrorCents.toFixed(2);
                    const ratioText = `${result.yuelu.d} : ${result.yuelu.n}`; // 约率: d:n

                    // (1) 显示 "约率" (Yuelü)
                    if (Math.abs(cents) < 0.01) {
                        intervalRatioEl.innerHTML = `约率: <strong style="font-size: 1.2em; vertical-align: -0.05em;">=</strong> ${ratioText} (Perfect)`;
                    } else if (cents > 0) {
                        intervalRatioEl.innerHTML = `约率: ≈ ${ratioText} (+${cents} cents)`;
                    } else {
                        intervalRatioEl.innerHTML = `约率: ≈ ${ratioText} (${cents} cents)`;
                    }

                    // (2) 显示 "密率" (Milü)
                    if (result.milu.n !== result.yuelu.n || result.milu.d !== result.yuelu.d) {
                        // 只有当密率和约率不同时才显示
                        const miluCents = result.miluErrorCents.toFixed(2);
                        const miluRatioText = `${result.milu.d} : ${result.milu.n}`;

                        if (Math.abs(miluCents) < 0.01) {
                            intervalErrorEl.innerText = `密率: = ${miluRatioText} (Perfect)`;
                        } else if (miluCents > 0) {
                            intervalErrorEl.innerText = `密率: ≈ ${miluRatioText} (+${miluCents} cents)`;
                        } else {
                            intervalErrorEl.innerText = `密率: ≈ ${miluRatioText} (${miluCents} cents)`;
                        }
                    } else {
                        // 约率已经是最好的了
                        intervalErrorEl.innerText = '';
                    }

                } else {
                    intervalRatioEl.innerText = '';
                    intervalErrorEl.innerText = '';
                }

            } else {
                // 清空 UI
                intervalResultEl.innerText = '';
                interval1El.innerText = firstNote || '--';
                interval2El.innerText = secondNote || '--';
                intervalRatioEl.innerText = '';
                intervalErrorEl.innerText = '';
            }
        }

        function resetSelection() {
            console.log("[Action] Reset selection.");
            firstNote = '';
            secondNote = '';
            updateDisplay(); // 调用 update 来清空
            container.querySelectorAll('[data-note]').forEach(t => {
                t.classList.remove(HIGH_LIGHT);
            });
        }

        // 钢琴点击事件
        container.addEventListener('click', (ev) => {
            const targetKey = ev.target.closest('[data-note]');
            if (!targetKey) return;
            const note = targetKey.dataset['note'];
            console.log(`[Action] Clicked note: ${note}`);

            // (点击逻辑不变)
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

            // 高亮 (不变)
            container.querySelectorAll('[data-note]').forEach(t => {
                t.classList.remove(HIGH_LIGHT);
            });
            if (firstNote) {
                container.querySelector(`[data-note="${firstNote}"]`).classList.add(HIGH_LIGHT);
            }
            if (secondNote) {
                container.querySelector(`[data-note="${secondNote}"]`).classList.add(HIGH_LIGHT);
            }

            // [!! 修改 !!]
            // 总是调用 updateDisplay 来计算和显示
            updateDisplay();
        });

        // 重置按钮 (不变)
        resetBtn.addEventListener('click', resetSelection);

        // [!! 移除 !!]
        // 移除了 'ratioPrecisionInput' 的事件监听器
    }

    // =====================================================================
    // =================== 3. 精简版 createPiano ========================
    // =====================================================================
    // (不变)

    function createSimplePiano(container) {
        // ... (createSimplePiano 函数 100% 不变) ...
        const piano = document.createElement("ul");
        piano.className = "piano";
        const notesWithOctave = [
            "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
            "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
            "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
            "C4"
        ];
        notesWithOctave.forEach((note) => {
            const li = document.createElement("li");
            const isBlack = note.includes("#");
            li.dataset.note = note;
            li.className = isBlack ? "black" : "white";
            const noteNameSpan = document.createElement("span");
            noteNameSpan.className = "note-name";
            if (!isBlack) {
                noteNameSpan.textContent = note.slice(0, -1);
            }
            li.appendChild(noteNameSpan);
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
    console.log("[Init] Interval Calculator is ready.");

});
