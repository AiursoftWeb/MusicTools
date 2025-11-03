window.addEventListener("load", () => {

    // =====================================================================
    // =================== 1. 大调专属数据定义 ==========================
    // =====================================================================

    // 大调音阶间隔 (W-W-H-W-W-W-H)
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

    // 大调调名 (用于五线谱显示)
    const KEY_SIGNATURE_NAMES = {
        0: { sharp: 'C Major' },
        7: { sharp: 'G Major' },
        2: { sharp: 'D Major' },
        9: { sharp: 'A Major' },
        4: { sharp: 'E Major' },
        11: { sharp: 'B Major', flat: 'C♭ Major' },
        6: { sharp: 'F♯ Major', flat: 'G♭ Major' },
        1: { sharp: 'C♯ Major', flat: 'D♭ Major' },
        5: { flat: 'F Major' },
        10: { flat: 'B♭ Major' },
        3: { flat: 'E♭ Major' },
        8: { flat: 'A♭ Major' }
    };

    // =====================================================================
    // =================== 2. 构建配置与启动引擎 ========================
    // =====================================================================

    // 1. 获取本地化文本
    const localeData = document.getElementById("localization-data");
    const localizedTonic = (localeData && localeData.dataset.tonic) ? localeData.dataset.tonic : "Tonic";

    // 2. 构建配置对象 (只传递专属数据)
    const majorConfig = {
        scaleIntervals: majorScaleIntervals,
        keySignatureNames: KEY_SIGNATURE_NAMES,
        jianpuPrefix: "1 = ", // 大调简谱前缀
        localizedTonicText: localizedTonic,
        // 注意: fifthsDegreePositions 已被移除，引擎将根据 scaleIntervals 自动计算
        getKeySignatureIndex: (tonic) => tonic,
        defaultStep: 0 // 默认从 'C' (索引0) 开始
    };

    // 3. 统一获取所有引擎需要的 DOM 元素
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

    // 4. 启动引擎
    // (确保 ScaleVisualizerEngine.js 已在 HTML <script> 标签中被此文件 *之前* 加载)
    if (typeof ScaleVisualizerEngine !== 'undefined') {
        const visualizer = new ScaleVisualizerEngine(majorConfig, domElements);
        visualizer.initialize();
    } else {
        console.error("ScaleVisualizerEngine.js 未加载。请确保它在 major.js 之前被引入。");
    }
});
