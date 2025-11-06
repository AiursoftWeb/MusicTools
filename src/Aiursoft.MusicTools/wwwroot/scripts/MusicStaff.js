/* =================================================================
 * == MusicStaff.js - 通用五线谱绘制控件
 * =================================================================
 *
 * 这是一个独立的、可复用的五线谱绘制模块。
 * 它不依赖任何其他脚本，只依赖 site.css 中的 Bravura 字体和
 * .clef, .accidental, .music-staff-note 等类的 transform 样式。
 *
 * ================================================================= */

class MusicStaff {

    // =================================================================
    // =================== 1. 核心数据 ==================================
    // =================================================================

    // [关键] 补偿 site.css 中的 'transform: translateY(-1.7em);'
    static CSS_VERTICAL_OFFSET_EM = 1.7;

    // [新添加] 调号中升降号的顺序
    static ORDER_OF_SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    static ORDER_OF_FLATS = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

    // [来自 ScaleVisualizerEngine.js] - 调号 (Key Signature) 的位置
    // 注意：这些值是 *已经补偿过* 的，它们与 'clef' 的 '2.7em' 逻辑一致。
    static ACCIDENTAL_POSITIONS = {
        treble: {
            sharps: [0, 1.5, -0.5, 1, 2.5, 0.5, 2],
            flats: [2, 0.5, 2.5, 1, 3, 1.5, 3.5],
        },
        bass: {
            sharps: [1, 2.5, 0.5, 2, 3.5, 1.5, 3],
            flats: [3, 1.5, 3.5, 2, 4, 2.5, 4.5],
        },
    };

    // [来自 staff-refactored.js] - 单个音符 (Note) 的 *理论* 位置
    // 0em = 顶线, 4em = 底线。这些值 *未* 补偿，JS 将动态添加补偿。
    static STAFF_POSITIONS = {
        treble: { 'C': 5, 'D': 4.5, 'E': 4, 'F': 3.5, 'G': 3, 'A': 2.5, 'B': 2 },
        bass: { 'C': 6, 'D': 5.5, 'E': 5, 'F': 4.5, 'G': 4, 'A': 3.5, 'B': 3 }
    };

    // [来自 staff-refactored.js] - 谱号字形
    static CLEF_GLYPHS = {
        treble: { glyph: '\uE050', top: '2.7em', size: '4em' }, // G-clef
        bass: { glyph: '\uE062', top: '0.7em', size: '4em' }  // F-clef
    };

    // [来自 staff-refactored.js] - 升降号字形
    static ACCIDENTAL_GLYPHS = {
        '#': '\uE262', // Sharp
        'b': '\uE260', // Flat
        '': ''         // Natural
    };

    // [来自 staff-refactored.js] - 音符字形
    static NOTE_GLYPHS = {
        STEM_UP: '\uE1D5',
        STEM_DOWN: '\uE1D6'
    };

    // =================================================================
    // =================== 2. 构造与 DOM ===============================
    // =================================================================

    #container;
    #staffWrapper;
    #keySignatureGroup; // 调号 "插槽"
    #noteGroup;         // 单个音符 "插槽"
    #clefType;
    #currentKeySignature;

    /**
     * @param {string} containerId
     * @param {object} options e.g., { clef: 'treble' | 'bass' }
     */
    constructor(containerId, options = {}) {
        this.#clefType = options.clef || 'treble';
        this.#container = document.getElementById(containerId);

        if (!this.#container) {
            console.error(`MusicStaff: 容器 #${containerId} 未找到。`);
            return;
        }

        this.#container.innerHTML = ''; // 确保容器是空的
        this.#createStaffDOM();

        // [新添加]
        this.#currentKeySignature = null; // 追踪当前调号
    }

    /**
     * (来自 ScaleVisualizerEngine.js)
     * 创建五线谱、谱号和用于绘制内容的 "插槽"
     */
    #createStaffDOM() {
        const wrapper = document.createElement("div");
        // [修改] 添加 position-relative 以便插槽定位
        wrapper.className = "staff-wrapper position-relative";
        this.#staffWrapper = wrapper;

        // 1. 绘制 5 条线
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "staff-line";
            line.style.top = `${i}em`;
            wrapper.appendChild(line);
        }

        // 2. 绘制谱号 (Clef)
        const clefInfo = MusicStaff.CLEF_GLYPHS[this.#clefType];
        const clefPositioner = document.createElement("span");
        clefPositioner.className = "clef"; // 使用现有的 .clef 类 (它有 transform)
        clefPositioner.style.top = clefInfo.top; // (这个值已补偿)
        clefPositioner.style.left = "5px";

        const clefGlyph = document.createElement("span");
        clefGlyph.textContent = clefInfo.glyph;
        clefGlyph.style.fontSize = clefInfo.size;

        clefPositioner.appendChild(clefGlyph);
        wrapper.appendChild(clefPositioner);

        // 3. 创建 "插槽"
        this.#keySignatureGroup = document.createElement('div');
        this.#keySignatureGroup.className = 'key-signature-group';
        wrapper.appendChild(this.#keySignatureGroup);

        this.#noteGroup = document.createElement('div');
        this.#noteGroup.className = 'note-group';
        wrapper.appendChild(this.#noteGroup);

        this.#container.appendChild(wrapper);
    }

    /**
     * 辅助函数：创建 Bravura 字体字形
     */
    #createGlyph(className, text, fontSize) {
        const positioner = document.createElement("span");
        positioner.className = className;

        const glyph = document.createElement("span");
        glyph.textContent = text;
        glyph.style.fontSize = fontSize;

        positioner.appendChild(glyph);
        return positioner;
    }

    // =================================================================
    // =================== 3. 公共 API =================================
    // =================================================================

    /**
     * 清除所有内容 (调号和音符)
     */
    clearAll() {
        this.clearKeySignature();
        this.clearNote();
    }

    /**
     * 清除调号
     */
    clearKeySignature() {
        this.#keySignatureGroup.innerHTML = '';
        this.#currentKeySignature = null; // [修改]
    }

    /**
     * 清除单个音符
     */
    clearNote() {
        this.#noteGroup.innerHTML = '';
    }

    /**
     * 绘制调号 (来自 ScaleVisualizerEngine.js)
     * @param {object} sig { type: 'sharps' | 'flats', count: number }
     */
    setKeySignature(sig) {
        this.clearKeySignature();
        this.#currentKeySignature = sig; // [修改]

        if (!sig || sig.count === 0) return;

        const { type, count } = sig;

        // [复用] 使用已补偿的 ACCIDENTAL_POSITIONS
        const positions = MusicStaff.ACCIDENTAL_POSITIONS[this.#clefType][type];
        const symbolText = type === 'sharps' ? MusicStaff.ACCIDENTAL_GLYPHS['#'] : MusicStaff.ACCIDENTAL_GLYPHS['b'];

        for (let i = 0; i < count; i++) {
            const positionerEl = document.createElement("span");
            // [复用] 使用现有的 .accidental 类 (它有 transform)
            positionerEl.className = "accidental";
            positionerEl.style.top = `${positions[i]}em`; // (这个值已补偿)
            positionerEl.style.left = `${100 + i * 24}px`;

            const glyphEl = document.createElement("span");
            glyphEl.textContent = symbolText;
            glyphEl.style.fontSize = "3.5em";

            positionerEl.appendChild(glyphEl);
            this.#keySignatureGroup.appendChild(positionerEl);
        }
    }

    /**
     * 绘制单个音符 (来自 staff-refactored.js)
     * @param {string} pitch (e.g., "G4", "F#5", "Eb3")
     */
    showNote(pitch) {
        this.clearNote();
        if (!pitch) return;

        // 1. 解析音高
        const letter = pitch.charAt(0).toUpperCase();
        const accidental = pitch.length > 2 && (pitch.charAt(1) === '#' || pitch.charAt(1) === 'b')
            ? pitch.charAt(1)
            : '';
        const octave = parseInt(pitch.slice(accidental.length + 1), 10);

        // 2. 计算理论位置 (未补偿)
        const basePosition = MusicStaff.STAFF_POSITIONS[this.#clefType][letter];
        const referenceOctave = this.#clefType === 'treble' ? 4 : 2;
        const octaveDifference = octave - referenceOctave;

        // 3. [修改] position 现在是最终的 *理论* 位置 (e.g., Treble C4 = 5)
        const position = basePosition - (octaveDifference * 3.5);

        // 4. [关键] 添加 CSS 补偿
        const finalTop = position + MusicStaff.CSS_VERTICAL_OFFSET_EM;

        // 5. [!! 修复 !!] 绘制加线 (Ledger Lines)
        // 检查是否在线谱下方 (e.g., C4[5], B3[5.5], A3[6])
        if (position >= 5) {
            // 从 5em (下加一线) 开始，画到音符位置
            for (let i = 5; i <= position; i++) {
                this.#drawLedgerLine(i);
            }
        }
        // 检查是否在线谱上方 (e.g., A5[-1], B5[-1.5], C6[-2])
        else if (position <= -1) {
            // 从 -1em (上加一线) 开始，画到音符位置
            for (let i = -1; i >= position; i--) {
                this.#drawLedgerLine(i);
            }
        }
        // (在 0 到 4 之间的音符不需要加线)

        // 6. [新逻辑] 检查这个升降号是否多余
        let isRedundant = false;
        if (this.#currentKeySignature && this.#currentKeySignature.count > 0) {
            const sig = this.#currentKeySignature;
            if (accidental === '#' && sig.type === 'sharps') {
                // 检查 F# 是否在 F#大调(6个升号)的调号内
                const sharpedNotes = MusicStaff.ORDER_OF_SHARPS.slice(0, sig.count);
                if (sharpedNotes.includes(letter)) {
                    isRedundant = true;
                }
            } else if (accidental === 'b' && sig.type === 'flats') {
                // 检查 Bb 是否在 Bb大调(2个降号)的调号内
                const flattedNotes = MusicStaff.ORDER_OF_FLATS.slice(0, sig.count);
                if (flattedNotes.includes(letter)) {
                    isRedundant = true;
                }
            }
        }

        // 7. 绘制升降号 (仅在需要且不多余时)
        const accidentalGlyph = MusicStaff.ACCIDENTAL_GLYPHS[accidental];
        if (accidentalGlyph && !isRedundant) { // <-- [关键] 添加了 !isRedundant 检查
            const accidentalEl = this.#createGlyph(
                'music-staff-accidental',
                accidentalGlyph,
                '2.5em'
            );
            accidentalEl.style.top = `${finalTop}em`;
            // [修改] 调整位置
            accidentalEl.style.left = '300px';
            this.#noteGroup.appendChild(accidentalEl);
        }

        // 8. 绘制音符
        const stemUp = (position > 2.0); // 符干方向基于 *理论* 位置
        const noteGlyph = stemUp ? MusicStaff.NOTE_GLYPHS.STEM_UP : MusicStaff.NOTE_GLYPHS.STEM_DOWN;
        const noteEl = this.#createGlyph(
            'music-staff-note',
            noteGlyph,
            '3.5em'
        );
        noteEl.style.top = `${finalTop}em`;
        // [修改] 调整位置
        noteEl.style.left = '320px';
        this.#noteGroup.appendChild(noteEl);
    }

    // =================================================================
    // =================== 4. [新] 私有函数 ===========================
    // =================================================================

    /**
     * [新] 绘制单根加线
     * @param {number} theoreticalPosition - 线的理论位置 (e.g., 5em for C4)
     */
    #drawLedgerLine(theoreticalPosition) {
        // [!! 修复 !!]
        // 加线 (Ledger Line) 是一个普通的 <div>, 它 *没有* 'transform' 样式。
        // 因此，它 *不能* 像音符一样被补偿 1.7em。
        // 它的 top 应该就是它的理论位置。
        const finalTop = theoreticalPosition; // <--- [修正] (之前是: theoreticalPosition + MusicStaff.CSS_VERTICAL_OFFSET_EM)

        const line = document.createElement("div");
        line.className = "music-staff-ledger-line";
        line.style.top = `${finalTop}em`; // (现在这将正确地输出 5.0em)
        line.style.left = '310px';

        this.#noteGroup.appendChild(line);
    }
}
