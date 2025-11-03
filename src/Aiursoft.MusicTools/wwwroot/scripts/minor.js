window.addEventListener("load", () => {

    // =====================================================================
    // =================== 1. 小调专属数据定义 ==========================
    // =====================================================================

    // 自然小调音阶间隔 (W-H-W-W-H-W-W)
    const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];

    // 小调调名 (用于五线谱显示)
    // 索引是小调的主音 (e.g., a小调, 索引为 9)
    const KEY_SIGNATURE_NAMES = {
        9: { sharp: 'a minor' },                 // 对应 C (0)
        4: { sharp: 'e minor' },                 // 对应 G (7)
        11: { sharp: 'b minor' },                // 对应 D (2)
        6: { sharp: 'f♯ minor', flat: 'g♭ minor' }, // 对应 A (9)
        1: { sharp: 'c♯ minor', flat: 'd♭ minor' }, // 对应 E (4)
        8: { sharp: 'g♯ minor', flat: 'a♭ minor' }, // 对应 B (11)
        3: { sharp: 'd♯ minor', flat: 'e♭ minor' }, // 对应 F# (6)
        10: { flat: 'g minor' },                 // 对应 F (5)
        5: { flat: 'c minor' },                 // 对应 Bb (10)
        0: { flat: 'f minor' },                 // 对应 Eb (3)
        7: { flat: 'b♭ minor' },                // 对应 Ab (8)
        2: { flat: 'd minor' }                  // 对应 Db (1) - 这是一个错误, d minor 对应 F, 是 5
    };

    // --- !! 修正上面的数据 !! ---
    // a小调(9) -> C(0) [0]
    // e小调(4) -> G(7) [1s]
    // b小调(11) -> D(2) [2s]
    // f#小调(6) -> A(9) [3s]
    // c#小调(1) -> E(4) [4s]
    // g#小调(8) -> B(11) [5s]
    // d#小调(3) -> F#(6) [6s]
    // (同上 d# = eb)
    // eb小调(3) -> Gb(6) [6f]

    // d小调(2) -> F(5) [1f]
    // g小调(10) -> Bb(10) [2f]
    // c小调(0) -> Eb(3) [3f]
    // f小调(5) -> Ab(8) [4f]
    // bb小调(7) -> Db(1) [5f]
    // eb小调(3) -> Gb(6) [6f]

    const MINOR_KEY_SIGNATURE_NAMES = {
        9: { sharp: 'a minor' },
        4: { sharp: 'e minor' },
        11: { sharp: 'b minor' },
        6: { sharp: 'f♯ minor', flat: 'g♭ minor' },
        1: { sharp: 'c♯ minor', flat: 'd♭ minor' },
        8: { sharp: 'g♯ minor', flat: 'a♭ minor' },
        3: { sharp: 'd♯ minor', flat: 'e♭ minor' },
        2: { flat: 'd minor' },
        10: { flat: 'g minor' },
        0: { flat: 'c minor' },
        5: { flat: 'f minor' },
        7: { flat: 'b♭ minor' }
    };


    // =====================================================================
    // =================== 2. 构建配置与启动引擎 ========================
    // =====================================================================

    // 1. 获取本地化文本 (假设 HTML 中会提供 "Minor Tonic" 或 "主音")
    const localeData = document.getElementById("localization-data");
    const localizedTonic = (localeData && localeData.dataset.tonic) ? localeData.dataset.tonic : "Tonic";
    let localizedPerfectUnison = (localeData && localeData.dataset.perfectUnison) ? localeData.dataset.perfectUnison : "PerfectUnison";
    let localizedMinorSecond = (localeData && localeData.dataset.minorSecond) ? localeData.dataset.minorSecond : "MinorSecond";
    let localizedMajorSecond = (localeData && localeData.dataset.majorSecond) ? localeData.dataset.majorSecond : "MajorSecond";
    let localizedMinorThird = (localeData && localeData.dataset.minorThird) ? localeData.dataset.minorThird : "MinorThird";
    let localizedMajorThird = (localeData && localeData.dataset.majorThird) ? localeData.dataset.majorThird : "MajorThird";
    let localizedPerfectFourth = (localeData && localeData.dataset.perfectFourth) ? localeData.dataset.perfectFourth : "PerfectFourth";
    let localizedAugmentedFourth = (localeData && localeData.dataset.augmentedFourth) ? localeData.dataset.augmentedFourth : "AugmentedFourth";
    let localizedPerfectFifth = (localeData && localeData.dataset.perfectFifth) ? localeData.dataset.perfectFifth : "PerfectFifth";
    let localizedMinorSixth = (localeData && localeData.dataset.minorSixth) ? localeData.dataset.minorSixth : "MinorSixth";
    let localizedMajorSixth = (localeData && localeData.dataset.majorSixth) ? localeData.dataset.majorSixth : "MajorSixth";
    let localizedMinorSeventh = (localeData && localeData.dataset.minorSeventh) ? localeData.dataset.minorSeventh : "MinorSeventh";
    let localizedMajorSeventh = (localeData && localeData.dataset.majorSeventh) ? localeData.dataset.majorSeventh : "MajorSeventh";
    let localizedPerfectOctave = (localeData && localeData.dataset.perfectOctave) ? localeData.dataset.perfectOctave : "PerfectOctave";
    let localizedUnableToRecognizeNoteName = (localeData && localeData.dataset.unableToRecognizeNoteName) ? localeData.dataset.unableToRecognizeNoteName : "UnableToRecognizeNoteName";
    let localizedPleaseIputWithTheLowerNoteFirst = (localeData && localeData.dataset.pleaseIputWithTheLowerNoteFirst) ? localeData.dataset.pleaseIputWithTheLowerNoteFirst : "PleaseIputWithTheLowerNoteFirst";

    // 2. 构建配置对象
    const minorConfig = {
        scaleIntervals: minorScaleIntervals,
        keySignatureNames: MINOR_KEY_SIGNATURE_NAMES,
        jianpuPrefix: "6 = ", // 小调简谱前缀 (关系调唱名法)
        localizedTonicText: localizedTonic,

        // --- !! 关键的小调逻辑 !! ---
        // 小调逻辑：主音索引 (tonic) +3 semitones = 关系大调的调号索引
        // 例如: a (9) -> (9 + 3) % 12 = 12 % 12 = 0 (C)
        // 例如: e (4) -> (4 + 3) % 12 = 7 (G)
        // 例如: d (2) -> (2 + 3) % 12 = 5 (F)
        getKeySignatureIndex: (tonic) => (tonic + 3) % 12,
        defaultStep: 9 // 默认从 'a' (索引9) 开始
    };

    // 3. 统一获取所有引擎需要的 DOM 元素 (与 major.js 完全相同)
    const domElements = {
        chromaticOuterCircle: document.getElementById("chromatic-outer-circle"),
        chromaticInnerCircle: document.getElementById("chromatic-inner-circle"),
        fifthsOuterCircle: document.getElementById("fifths-outer-circle"),
        fifthsInnerCircle: document.getElementById("fifths-inner-circle"),
        chromaticLeftBtn: document.getElementById("chromatic-rotate-left"),
        chromaticRightBtn: document.getElementById("chromatic-rotate-right"),
        fifthsLeftBtn: document.getElementById("fifths-rotate-left"),
        fifthsRightBtn: document.getElementById("fifths-rotate-right"),
        pianoContainer: document.querySelector(".piano-container"),
        keySigContainer: document.getElementById("key-signature-container"),
        keySelectorDropdown: document.getElementById("key-selector-dropdown"),
        jianpuDisplayContainer: document.getElementById("jianpu-display-container"),
        playStopButton: document.getElementById('play-stop-btn'),
        songSelector: document.getElementById('song-selector-dropdown'),
        loopCheckbox: document.getElementById('loop-song-checkbox')
    };


    // calculate piano interval
    function calculatePianoInterval(pianoContainer) {
        const HIGH_LIGHT = 'select-highlight';
        let firstNote = '', secondNote = '';

        pianoContainer.addEventListener('click', (ev) => {
            const note = ev.target.dataset['note'];
            if (!firstNote) {
                firstNote = note;
            } else if (!secondNote) {
                secondNote = note;
            } else if (firstNote === note) {
                firstNote = '';
            } else if (secondNote === note) {
                secondNote = '';
            } else {
                secondNote = note;
            }

            pianoContainer.querySelectorAll('[data-note]')
            for (const t of pianoContainer.querySelectorAll('[data-note]')) {
                t.classList.remove(HIGH_LIGHT)
            }

            console.log(`first: ${firstNote}, second: ${secondNote}`)

            if (firstNote) {
                pianoContainer.querySelector(`[data-note="${firstNote}"]`).classList.add(HIGH_LIGHT)
            }
            if (secondNote) {
                pianoContainer.querySelector(`[data-note="${secondNote}"]`).classList.add(HIGH_LIGHT)
            }

            document.getElementById('interval-1').innerText = firstNote;
            document.getElementById('interval-2').innerText = secondNote;

            if (firstNote && secondNote) {
                const interval = calculateInterval(firstNote, secondNote)
                document.getElementById('interval-result').innerText = interval;
            } else {
                document.getElementById('interval-result').innerText = '';
            }
        });
    }

    function calculateInterval(note1, note2) {
        const BASE_NOTES = {
            "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
            "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
        };

        const INTERVAL_MAP = {
            0: { "name": localizedPerfectUnison, "degree": 1 },
            1: { "name": localizedMinorSecond, "degree": 2 },
            2: { "name": localizedMajorSecond, "degree": 2 },
            3: { "name": localizedMinorThird, "degree": 3 },
            4: { "name": localizedMajorThird, "degree": 3 },
            5: { "name": localizedPerfectFourth, "degree": 4 },
            6: { "name": localizedAugmentedFourth, "degree": 4.5 }, // 特殊情况：三全音
            7: { "name": localizedPerfectFifth, "degree": 5 },
            8: { "name": localizedMinorSixth, "degree": 6 },
            9: { "name": localizedMajorSixth, "degree": 6 },
            10: { "name": localizedMinorSeventh, "degree": 7 },
            11: { "name": localizedMajorSeventh, "degree": 7 },
            12: { "name": localizedPerfectOctave, "degree": 8 }
        };

        function getAbsoluteSemitoneValue(note) {
            let octave = 1;
            let noteName = note;

            const match = note.match(/(\d+)$/);
            if (match) {
                octave = parseInt(match[1], 10);
                noteName = note.slice(0, -match[1].length);
            }

            const baseValue = BASE_NOTES[noteName];
            if (baseValue === undefined) {
                throw new Error(`${localizedUnableToRecognizeNoteName}: ${noteName}`);
            }

            return baseValue + (octave - 1) * 12;
        }

        try {
            const val1 = getAbsoluteSemitoneValue(note1);
            const val2 = getAbsoluteSemitoneValue(note2);

            let semitones = val2 - val1;

            if (semitones < 0) {
                return `${note1} > ${note2}, ${localizedPleaseIputWithTheLowerNoteFirst}`;
            }

            if (semitones > 12) {
                const octaves = Math.floor(semitones / 12);
                const remainingSemitones = semitones % 12;

                if (remainingSemitones === 0) {
                    return `${localizedPerfectOctave} x ${octaves}`;
                }

                const baseInterval = INTERVAL_MAP[remainingSemitones];

                return `${octaves} ${localizedPerfectOctave} + ${baseInterval.name}`;
            }

            if (INTERVAL_MAP[semitones]) {
                return INTERVAL_MAP[semitones].name;
            }

            if (semitones === 6) {
                return INTERVAL_MAP[6].name;
            }


        } catch (e) {
            return `Wrong: ${e.message}`;
        }
    }

    // 4. 启动引擎
    if (typeof ScaleVisualizerEngine !== 'undefined') {
        const visualizer = new ScaleVisualizerEngine(minorConfig, domElements);
        visualizer.initialize();
        calculatePianoInterval(domElements.pianoContainer);

    } else {
        console.error("ScaleVisualizerEngine.js 未加载。");
    }
});
