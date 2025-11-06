window.addEventListener("load", () => {

    // =====================================================================
    // =================== 1. 小调专属数据定义 ==========================
    // =====================================================================

    const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];

    // [新设计]
    // 完整的小调定义，基于关系大调调号
    // 这解决了 B♭ minor 的 Bug
    const MINOR_KEY_DEFINITIONS = {
        0: {
            flat:  { name: 'c minor', signature: { type: 'flats', count: 3 } } // 关系 Eb (3)
        },
        1: {
            sharp: { name: 'c♯ minor', signature: { type: 'sharps', count: 4 } } // 关系 E (4)
            // d♭ minor (关系 Fb) 不常用
        },
        2: {
            flat:  { name: 'd minor', signature: { type: 'flats', count: 1 } } // 关系 F (5)
        },
        3: {
            sharp: { name: 'd♯ minor', signature: { type: 'sharps', count: 6 } }, // 关系 F# (6)
            flat:  { name: 'e♭ minor', signature: { type: 'flats',  count: 6 } }  // 关系 Gb (6)
        },
        4: {
            sharp: { name: 'e minor', signature: { type: 'sharps', count: 1 } } // 关系 G (7)
        },
        5: {
            flat:  { name: 'f minor', signature: { type: 'flats', count: 4 } } // 关系 Ab (8)
        },
        6: {
            sharp: { name: 'f♯ minor', signature: { type: 'sharps', count: 3 } }, // 关系 A (9)
        },
        7: {
            flat:  { name: 'g minor', signature: { type: 'flats', count: 2 } } // 关系 Bb (10)
        },
        8: {
            sharp: { name: 'g♯ minor', signature: { type: 'sharps', count: 5 } }, // 关系 B (11)
            flat:  { name: 'a♭ minor', signature: { type: 'flats',  count: 7 } }  // 关系 Cb (11)
        },
        9: {
            sharp: { name: 'a minor', signature: { type: 'sharps', count: 0 } } // 关系 C (0)
        },
        10: {
            sharp: { name: 'a♯ minor', signature: { type: 'sharps', count: 7 } }, // 关系 C# (1)
            flat:  { name: 'b♭ minor', signature: { type: 'flats',  count: 5 } }  // 关系 Db (1)
        },
        11: {
            sharp: { name: 'b minor', signature: { type: 'sharps', count: 2 } } // 关系 D (2)
        }
    };


    // =====================================================================
    // =================== 2. 构建配置与启动引擎 ========================
    // =====================================================================

    const localeData = document.getElementById("localization-data");
    const localizedTonic = (localeData && localeData.dataset.tonic) ? localeData.dataset.tonic : "Tonic";

    // [新设计] 配置对象现在传递 keyDefinitions
    const minorConfig = {
        scaleIntervals: minorScaleIntervals,
        keyDefinitions: MINOR_KEY_DEFINITIONS, // <--- [修改]
        jianpuPrefix: "6 = ",
        localizedTonicText: localizedTonic,
        // getKeySignatureIndex: (tonic) => (tonic + 3) % 12, // <--- [删除]
        defaultStep: 9
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
        const visualizer = new ScaleVisualizerEngine(minorConfig, domElements);
        visualizer.initialize();
    } else {
        console.error("ScaleVisualizerEngine.js 未加载。");
    }
});
