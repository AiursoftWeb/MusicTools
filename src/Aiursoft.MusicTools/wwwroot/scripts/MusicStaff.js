/* =================================================================
 * == MusicStaff.js - 通用五线谱绘制控件
 * =================================================================
 * ... (注释不变) ...
 * ================================================================= */

class MusicStaff {

    // =================================================================
    // =================== 1. 核心数据 ==================================
    // =================================================================

    // ... (所有静态数据: CSS_VERTICAL_OFFSET_EM, ACCIDENTAL_POSITIONS, 等... 保持不变)
    static CSS_VERTICAL_OFFSET_EM = 1.7;
    static ORDER_OF_SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    static ORDER_OF_FLATS = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
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
    static STAFF_POSITIONS = {
        treble: { 'C': 5, 'D': 4.5, 'E': 4, 'F': 3.5, 'G': 3, 'A': 2.5, 'B': 2 },
        bass: { 'C': 6, 'D': 5.5, 'E': 5, 'F': 4.5, 'G': 4, 'A': 3.5, 'B': 3 }
    };
    static CLEF_GLYPHS = {
        treble: { glyph: '\uE050', top: '2.7em', size: '4em' }, // G-clef
        bass: { glyph: '\uE062', top: '0.7em', size: '4em' }  // F-clef
    };
    static ACCIDENTAL_GLYPHS = {
        '#': '\uE262', // Sharp
        'b': '\uE260', // Flat
        '': ''         // Natural
    };
    static NOTE_GLYPHS = {
        STEM_UP: '\uE1D5',
        STEM_DOWN: '\uE1D6'
    };


    // =================================================================
    // =================== 2. 构造与 DOM ===============================
    // =================================================================

    #container;
    #staffWrapper;
    #keySignatureGroup;
    #noteGroup;
    #clefType;
    #currentKeySignature;

    constructor(containerId, options = {}) {
        // ... (构造函数不变) ...
        this.#clefType = options.clef || 'treble';
        this.#container = document.getElementById(containerId);

        if (!this.#container) {
            console.error(`MusicStaff: 容器 #${containerId} 未找到。`);
            return;
        }

        this.#container.innerHTML = '';
        this.#createStaffDOM();
        this.#currentKeySignature = null;
    }

    #createStaffDOM() {
        // ... (此函数不变) ...
        const wrapper = document.createElement("div");
        wrapper.className = "staff-wrapper position-relative";
        this.#staffWrapper = wrapper;
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "staff-line";
            line.style.top = `${i}em`;
            wrapper.appendChild(line);
        }
        const clefInfo = MusicStaff.CLEF_GLYPHS[this.#clefType];
        const clefPositioner = document.createElement("span");
        clefPositioner.className = "clef";
        clefPositioner.style.top = clefInfo.top;
        clefPositioner.style.left = "5px";
        const clefGlyph = document.createElement("span");
        clefGlyph.textContent = clefInfo.glyph;
        clefGlyph.style.fontSize = clefInfo.size;
        clefPositioner.appendChild(clefGlyph);
        wrapper.appendChild(clefPositioner);
        this.#keySignatureGroup = document.createElement('div');
        this.#keySignatureGroup.className = 'key-signature-group';
        wrapper.appendChild(this.#keySignatureGroup);
        this.#noteGroup = document.createElement('div');
        this.#noteGroup.className = 'note-group';
        wrapper.appendChild(this.#noteGroup);
        this.#container.appendChild(wrapper);
    }

    #createGlyph(className, text, fontSize) {
        // ... (此函数不变) ...
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

    clearAll() {
        // ... (此函数不变) ...
        this.clearKeySignature();
        this.clearNote();
    }

    clearKeySignature() {
        // ... (此函数不变) ...
        this.#keySignatureGroup.innerHTML = '';
        this.#currentKeySignature = null;
    }

    clearNote() {
        // ... (此函数不变) ...
        this.#noteGroup.innerHTML = '';
    }

    setKeySignature(sig) {
        // ... (此函数不变) ...
        this.clearKeySignature();
        this.#currentKeySignature = sig; // <-- [关键] 调号在这里被设置

        if (!sig || sig.count === 0) return;
        const { type, count } = sig;
        const positions = MusicStaff.ACCIDENTAL_POSITIONS[this.#clefType][type];
        const symbolText = type === 'sharps' ? MusicStaff.ACCIDENTAL_GLYPHS['#'] : MusicStaff.ACCIDENTAL_GLYPHS['b'];

        for (let i = 0; i < count; i++) {
            const positionerEl = document.createElement("span");
            positionerEl.className = "accidental";
            positionerEl.style.top = `${positions[i]}em`;
            positionerEl.style.left = `${100 + i * 24}px`;
            const glyphEl = document.createElement("span");
            glyphEl.textContent = symbolText;
            glyphEl.style.fontSize = "3.5em";
            positionerEl.appendChild(glyphEl);
            this.#keySignatureGroup.appendChild(positionerEl);
        }
    }

    /**
     * [!! 最终修复 !!] 绘制单个音符
     */
    showNote(pitch) {
        this.clearNote();
        if (!pitch) return;

        // 1. 解析音高 (不变)
        const letter = pitch.charAt(0).toUpperCase();
        const accidental = pitch.length > 2 && (pitch.charAt(1) === '#' || pitch.charAt(1) === 'b')
            ? pitch.charAt(1)
            : '';
        const octave = parseInt(pitch.slice(accidental.length + 1), 10);

        // 2. 计算位置 (不变)
        const basePosition = MusicStaff.STAFF_POSITIONS[this.#clefType][letter];
        const referenceOctave = this.#clefType === 'treble' ? 4 : 2;
        const octaveDifference = octave - referenceOctave;
        const position = basePosition - (octaveDifference * 3.5);
        const finalTop = position + MusicStaff.CSS_VERTICAL_OFFSET_EM;

        // 3. 检查是否需要绘制 *单个音符的* 升降号 (不变)
        let isAccidentalDrawn = false;
        const accidentalGlyph = MusicStaff.ACCIDENTAL_GLYPHS[accidental];

        if (accidentalGlyph) {
            let isRedundant = false;
            if (this.#currentKeySignature && this.#currentKeySignature.count > 0) {
                const sig = this.#currentKeySignature;
                if (accidental === '#' && sig.type === 'sharps') {
                    const sharpedNotes = MusicStaff.ORDER_OF_SHARPS.slice(0, sig.count);
                    if (sharpedNotes.includes(letter)) {
                        isRedundant = true;
                    }
                } else if (accidental === 'b' && sig.type === 'flats') {
                    const flattedNotes = MusicStaff.ORDER_OF_FLATS.slice(0, sig.count);
                    if (flattedNotes.includes(letter)) {
                        isRedundant = true;
                    }
                }
            }
            if (!isRedundant) {
                isAccidentalDrawn = true;
            }
        }

        // 4. [!! 逻辑修复 !!]
        // 检查 *调号 (Key Signature)* 是否存在
        const hasKeySignature = (this.#currentKeySignature && this.#currentKeySignature.count > 0);

        // (我保留了你设置的 220px，虽然这个值看起来很大)
        const KEY_SIGNATURE_SPACE_SHIFT = 160;

        let noteLeftPx = 320;
        let ledgerLeftPx = 310;
        let accidentalLeftPx = 300; // 单个升降号的基础位置

        if (!hasKeySignature) { // <-- [!! 修复 !!]
            // 如果没有调号 (C Major / a minor / 音程考试页)
            // 将所有东西向左移动
            noteLeftPx -= KEY_SIGNATURE_SPACE_SHIFT;
            ledgerLeftPx -= KEY_SIGNATURE_SPACE_SHIFT;
            accidentalLeftPx -= KEY_SIGNATURE_SPACE_SHIFT; // <-- [!! 修复 !!]
        }

        // 5. [修改] 绘制谱加线 (传入动态的 left 位置)
        if (position >= 5) {
            for (let i = 5; i <= position; i++) {
                this.#drawLedgerLine(i, ledgerLeftPx);
            }
        }
        else if (position <= -1) {
            for (let i = -1; i >= position; i--) {
                this.#drawLedgerLine(i, ledgerLeftPx);
            }
        }

        // 6. [修改] 绘制升降号 (传入动态的 left 位置)
        if (isAccidentalDrawn) {
            const accidentalEl = this.#createGlyph(
                'music-staff-accidental',
                accidentalGlyph,
                '2.5em'
            );
            accidentalEl.style.top = `${finalTop}em`;
            accidentalEl.style.left = `${accidentalLeftPx}px`; // <-- [!! 修复 !!]
            this.#noteGroup.appendChild(accidentalEl);
        }

        // 7. [修改] 绘制音符 (传入动态的 left 位置)
        const stemUp = (position > 2.0);
        const noteGlyph = stemUp ? MusicStaff.NOTE_GLYPHS.STEM_UP : MusicStaff.NOTE_GLYPHS.STEM_DOWN;
        const noteEl = this.#createGlyph(
            'music-staff-note',
            noteGlyph,
            '3.5em'
        );
        noteEl.style.top = `${finalTop}em`;
        noteEl.style.left = `${noteLeftPx}px`; // <-- (这已经正确)
        this.#noteGroup.appendChild(noteEl);
    }

    // =================================================================
    // =================== 4. [修改] 私有函数 ===========================
    // =================================================================

    /**
     * [修改] 绘制单根加线
     * @param {number} theoreticalPosition - 线的理论位置 (e.g., 5em for C4)
     * @param {number} leftPx - [新] 线的水平位置 (e.g., 310 or 90)
     */
    #drawLedgerLine(theoreticalPosition, leftPx) {
        const finalTop = theoreticalPosition;

        const line = document.createElement("div");
        line.className = "music-staff-ledger-line";
        line.style.top = `${finalTop}em`;
        line.style.left = `${leftPx}px`; // <-- 使用动态位置

        this.#noteGroup.appendChild(line);
    }
}
