window.addEventListener("load", () => {

    // =====================================================================
    // =================== 1. 大调专属数据定义 ==========================
    // =====================================================================

    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

    // [新设计]
    // 这是一个完整的数据结构。键(Key)是主音索引 (tonic)。
    // 它直接告诉引擎该画什么调号，而不需要计算。
    const MAJOR_KEY_DEFINITIONS = {
        0: {
            sharp: { name: 'C Major', signature: { type: 'sharps', count: 0 } }
        },
        1: {
            sharp: { name: 'C♯ Major', signature: { type: 'sharps', count: 7 } },
            flat:  { name: 'D♭ Major', signature: { type: 'flats',  count: 5 } }
        },
        2: {
            sharp: { name: 'D Major', signature: { type: 'sharps', count: 2 } }
        },
        3: {
            flat:  { name: 'E♭ Major', signature: { type: 'flats',  count: 3 } }
        },
        4: {
            sharp: { name: 'E Major', signature: { type: 'sharps', count: 4 } }
        },
        5: {
            flat:  { name: 'F Major', signature: { type: 'flats',  count: 1 } }
        },
        6: {
            sharp: { name: 'F♯ Major', signature: { type: 'sharps', count: 6 } },
            flat:  { name: 'G♭ Major', signature: { type: 'flats',  count: 6 } }
        },
        7: {
            sharp: { name: 'G Major', signature: { type: 'sharps', count: 1 } }
        },
        8: {
            flat:  { name: 'A♭ Major', signature: { type: 'flats',  count: 4 } }
        },
        9: {
            sharp: { name: 'A Major', signature: { type: 'sharps', count: 3 } }
        },
        10: {
            flat:  { name: 'B♭ Major', signature: { type: 'flats',  count: 2 } }
        },
        11: {
            sharp: { name: 'B Major', signature: { type: 'sharps', count: 5 } },
            flat:  { name: 'C♭ Major', signature: { type: 'flats',  count: 7 } }
        }
    };

    // =====================================================================
    // =================== 2. 构建配置与启动引擎 ========================
    // =====================================================================

    const localeData = document.getElementById("localization-data");
    const localizedTonic = (localeData && localeData.dataset.tonic) ? localeData.dataset.tonic : "Tonic";

    // [新设计] 配置对象现在传递 keyDefinitions
    const majorConfig = {
        scaleIntervals: majorScaleIntervals,
        keyDefinitions: MAJOR_KEY_DEFINITIONS, // <--- [修改]
        jianpuPrefix: "1 = ",
        localizedTonicText: localizedTonic,
        // getKeySignatureIndex: (tonic) => tonic,  // <--- [删除]
        defaultStep: 0
    };

    // 3. 统一获取所有引擎需要的 DOM 元素 (不变)
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
        treblePair: document.getElementById("treble-pair"),
        bassPair: document.getElementById("bass-pair"),
        trebleStaffContainer: document.getElementById("treble-staff-container"),
        bassStaffContainer: document.getElementById("bass-staff-container"),
        trebleKeyNameLabel: document.getElementById("treble-key-name-label"),
        bassKeyNameLabel: document.getElementById("bass-key-name-label"),
        enhTreblePair: document.getElementById("enh-treble-pair"),
        enhBassPair: document.getElementById("enh-bass-pair"),
        enhTrebleStaffContainer: document.getElementById("enh-treble-staff-container"),
        enhBassStaffContainer: document.getElementById("enh-bass-staff-container"),
        enhTrebleKeyNameLabel: document.getElementById("enh-treble-key-name-label"),
        enhBassKeyNameLabel: document.getElementById("enh-bass-key-name-label"),
        keySelectorDropdown: document.getElementById("key-selector-dropdown"),
        jianpuDisplayContainer: document.getElementById("jianpu-display-container"),
        playStopButton: document.getElementById('play-stop-btn'),
        songSelector: document.getElementById('song-selector-dropdown'),
        loopCheckbox: document.getElementById('loop-song-checkbox')
    };

    // 4. 启动引擎 (不变)
    if (typeof ScaleVisualizerEngine !== 'undefined') {
        const visualizer = new ScaleVisualizerEngine(majorConfig, domElements);
        visualizer.initialize();
    } else {
        console.error("ScaleVisualizerEngine.js 未加载。请确保它在 major.js 之前被引入。");
    }
});
