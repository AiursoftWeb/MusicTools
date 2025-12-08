import Piano from './Piano.js';

// 钢琴键盘的 "data-note" 使用的是升号 (#)
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// 乐理上 "小" 和 "减" 音程倾向于使用降号 (b)
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

window.addEventListener('DOMContentLoaded', () => {
    // =====================================================================
    // =================== 1. DOM 和本地化 ==============================
    // =====================================================================
    console.log("[Init] interval.js loading...");

    // (A) 获取 DOM 元素
    const pianoContainer = document.querySelector(".piano-container");
    const interval1El = document.getElementById('interval-1');
    const interval2El = document.getElementById('interval-2');
    const intervalResultEl = document.getElementById('interval-result');
    const intervalConsonanceEl = document.getElementById('interval-consonance');
    const resetBtn = document.getElementById('reset-interval-btn');
    const intervalRatioEl = document.getElementById('interval-ratio');
    const intervalErrorEl = document.getElementById('interval-error');

    // (B) [!! 修复 !!] 确保你使用的是唯一的 ID，例如 "calc-localization-data"
    let localeData = document.getElementById("calc-localization-data");
    if (!localeData) {
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
        pleaseIputWithTheLowerNoteFirst: localeData.dataset.pleaseIputWithTheLowerNoteFirst,
        
        // Consonance levels
        consonancePerfect: localeData.dataset.consonancePerfect,
        consonanceImperfect: localeData.dataset.consonanceImperfect,
        consonanceDissonance: localeData.dataset.consonanceDissonance,
        consonanceSharpDissonance: localeData.dataset.consonanceSharpDissonance
    };
    console.log("[Init] Localization strings loaded.");

    // Initialize Piano
    const piano = new Piano(pianoContainer, {
        octaves: 3,
        startOctave: 4,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    setupIntervalCalculator();


    // =====================================================================
    // =================== 2. 核心功能逻辑 ===============================
    // =====================================================================

    const HIGH_LIGHT = 'select-highlight';
    const MILU_SEARCH_LIMIT = 400;

    // (calculateErrorInCents, findBestRational, calculateInterval 100% 不变)
    function calculateErrorInCents(tetRatio, rationalRatio) {
        if (!tetRatio || !rationalRatio) return 0;
        const cents = 1200 * Math.log2(tetRatio / rationalRatio);
        console.log(`[Debug Cents] 12TET: ${tetRatio}, Rational: ${rationalRatio}, Cents: ${cents}`);
        return cents;
    }
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
    
    function getConsonanceLevel(semitones) {
        const mod = semitones % 12;
        switch (mod) {
            case 0: // P1, P8
            case 5: // P4
            case 7: // P5
                return localizedStrings.consonancePerfect;
            case 3: // m3
            case 4: // M3
            case 8: // m6
            case 9: // M6
                return localizedStrings.consonanceImperfect;
            case 2: // M2
            case 10: // m7
                return localizedStrings.consonanceDissonance;
            case 1: // m2
            case 6: // Tritone
            case 11: // M7
                return localizedStrings.consonanceSharpDissonance;
            default:
                return "";
        }
    }

    function calculateInterval(note1, note2) {
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
            const semitones = targetParsed.absoluteValue - rootParsed.absoluteValue;
            const tetRatio = Math.pow(2, semitones / 12);
            const yuelu = findBestRational(tetRatio, 10);
            const yueluErrorCents = calculateErrorInCents(tetRatio, (yuelu.n / yuelu.d));
            let milu = yuelu;
            for (let maxInt = 11; maxInt <= MILU_SEARCH_LIMIT; maxInt++) {
                const currentApprox = findBestRational(tetRatio, maxInt);
                if (currentApprox.n !== yuelu.n || currentApprox.d !== yuelu.d) {
                    milu = currentApprox;
                    console.log(`[Debug Milu] Found Milü at maxInt=${maxInt} -> ${milu.n}:${milu.d}`);
                    break;
                }
            }
            const miluErrorCents = calculateErrorInCents(tetRatio, (milu.n / milu.d));
            console.log(`[Debug Calc] Semitones: ${semitones}, 12-TET Ratio: ${tetRatio}`);
            const intervalInfo = INTERVAL_MAP[semitones];
            if (!intervalInfo) {
                const errName = `Interval too large (${semitones} semitones)`;
                console.warn(`[Debug Calc] ${errName}`);
                return {
                    note1: rootParsed.noteName + rootParsed.octave,
                    note2: targetParsed.noteName + targetParsed.octave,
                    intervalName: errName,
                    consonance: "",
                    yuelu: yuelu,
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
            
            const consonance = getConsonanceLevel(semitones);

            return {
                note1: rootDisplay,
                note2: targetDisplay,
                intervalName: intervalInfo.name,
                consonance: consonance,
                yuelu: yuelu,
                yueluErrorCents: yueluErrorCents,
                milu: milu,
                miluErrorCents: miluErrorCents
            };
        } catch (e) {
            console.error(`[Debug Calc] Error: ${e.message}`);
            return { note1: note1, note2: note2, intervalName: `Error: ${e.message}`, consonance: "" };
        }
    }

    /**
     * [!! 重构 !!]
     * 事件处理器现在使用 Piano.js API
     */
    function setupIntervalCalculator() {
        let firstNote = '', secondNote = '';
        console.log("[Init] Setting up Interval Calculator...");

        // (updateDisplay 辅助函数不变)
        function updateDisplay() {
            if (firstNote && secondNote) {
                console.log(`[Debug UI] Calculating interval for ${firstNote} and ${secondNote}`);
                const result = calculateInterval(firstNote, secondNote);

                intervalResultEl.innerText = result.intervalName;
                intervalConsonanceEl.innerText = result.consonance;
                interval1El.innerText = result.note1;
                interval2El.innerText = result.note2;

                if (result.yuelu) {
                    const cents = result.yueluErrorCents.toFixed(2);
                    const ratioText = `${result.yuelu.d} : ${result.yuelu.n}`;
                    if (Math.abs(cents) < 0.01) {
                        intervalRatioEl.innerHTML = `约率: <strong style="font-size: 1.2em; vertical-align: -0.05em;">=</strong> ${ratioText} (Perfect)`;
                    } else if (cents > 0) {
                        intervalRatioEl.innerHTML = `约率: ≈ ${ratioText} (+${cents} cents)`;
                    } else {
                        intervalRatioEl.innerHTML = `约率: ≈ ${ratioText} (${cents} cents)`;
                    }
                    if (result.milu.n !== result.yuelu.n || result.milu.d !== result.yuelu.d) {
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
                        intervalErrorEl.innerText = '';
                    }
                } else {
                    intervalRatioEl.innerText = '';
                    intervalErrorEl.innerText = '';
                }
            } else {
                intervalResultEl.innerText = '';
                intervalConsonanceEl.innerText = '';
                interval1El.innerText = firstNote || '--';
                interval2El.innerText = secondNote || '--';
                intervalRatioEl.innerText = '';
                intervalErrorEl.innerText = '';
            }
        }

        // (resetSelection 辅助函数被重构)
        function resetSelection() {
            console.log("[Action] Reset selection.");
            firstNote = '';
            secondNote = '';
            updateDisplay(); // 调用 update 来清空
            piano.clearAllHighlights(); // [!! API !!]
        }

        // [!! 重构 !!]
        // 移除了旧的 'container.addEventListener'
        // 换用了新的 'piano.onClick' API
        piano.onClick((note) => {
            console.log(`[Action] Clicked note: ${note}`);
            // (点击发声由 Piano.js 自动处理)

            // (你的状态管理逻辑不变)
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

            // [!! API !!] 重构高亮
            piano.clearAllHighlights();
            if (firstNote) {
                piano.highlightKeys([firstNote], HIGH_LIGHT);
            }
            if (secondNote) {
                piano.highlightKeys([secondNote], HIGH_LIGHT);
            }

            // [!! API !!] 更新显示
            updateDisplay();
        });

        // 重置按钮 (不变)
        resetBtn.addEventListener('click', resetSelection);
    }

    // =====================================================================
    // =================== 3. [!! 移除 !!] ================================
    // =====================================================================

    // createSimplePiano() 函数已删除

    // =====================================================================
    // =================== 4. 启动! =====================================
    // =====================================================================

    // [!! 移除 !!]
    // createSimplePiano(pianoContainer);

    // [!! 修改 !!]
    // 只需要调用 setupIntervalCalculator 即可，piano 已经在顶部创建
    console.log("[Init] Interval Calculator is ready.");

});
