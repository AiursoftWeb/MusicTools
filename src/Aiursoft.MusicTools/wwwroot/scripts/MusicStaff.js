/* =================================================================
 * == MusicStaff.js
 * ================================================================= */

class MusicStaff {

    // =================================================================
    // =================== 1. 核心数据 ==================================
    // =================================================================

    // ... (CSS_VERTICAL_OFFSET_EM, ORDER_OF_SHARPS, 等不变) ...
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
        treble: { glyph: '\uE050', top: '2.7em', size: '4em' },
        bass: { glyph: '\uE062', top: '0.7em', size: '4em' }
    };

    // [!! 修改 !!]
    static ACCIDENTAL_GLYPHS = {
        '#': '\uE262', // Sharp
        'b': '\uE260', // Flat
        '𝄪': '\uE263', // Double Sharp (Bravura)
        '𝄫': '\uE264', // Double Flat (Bravura)
        '': ''         // Natural
    };

    static NOTE_GLYPHS = {
        STEM_UP: '\uE1D5',
        STEM_DOWN: '\uE1D6'
    };


    // =================================================================
    // =================== 2. 构造与 DOM ===============================
    // =================================================================

    // ... (constructor, #createStaffDOM, #createGlyph 不变) ...
    #container;
    #staffWrapper;
    #keySignatureGroup;
    #noteGroup;
    #clefType;
    #currentKeySignature;

    constructor(containerId, options = {}) {
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

    // ... (clearAll, clearKeySignature, clearNote, setKeySignature 不变) ...
    clearAll() {
        this.clearKeySignature();
        this.clearNote();
    }

    clearKeySignature() {
        this.#keySignatureGroup.innerHTML = '';
        this.#currentKeySignature = null;
    }

    clearNote() {
        this.#noteGroup.innerHTML = '';
    }

    setKeySignature(sig) {
        this.clearKeySignature();
        this.#currentKeySignature = sig;

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
     * [!! 修改 !!] 绘制单个音符
     * (现在可以解析 C𝄪5 这样的音高)
     */
    showNote(pitch) {
        this.clearNote();
        if (!pitch) return;

        // 1. [!! 修复 !!] 解析音高
        const letter = pitch.charAt(0).toUpperCase(); // 'C'
        const octave = pitch.slice(-1); // '5'
        const accidental = pitch.slice(1, -1); // '𝄪' (或 '#', 'b', '')
        const octaveNum = parseInt(octave, 10);

        // 2. 计算位置
        const basePosition = MusicStaff.STAFF_POSITIONS[this.#clefType][letter];
        const referenceOctave = this.#clefType === 'treble' ? 4 : 2;
        const octaveDifference = octaveNum - referenceOctave;
        const position = basePosition - (octaveDifference * 3.5);
        const finalTop = position + MusicStaff.CSS_VERTICAL_OFFSET_EM;

        // 3. 检查是否需要绘制升降号 (逻辑不变, 但 'accidental' 变量已更新)
        let isAccidentalDrawn = false;
        const accidentalGlyph = MusicStaff.ACCIDENTAL_GLYPHS[accidental];

        if (accidentalGlyph) {
            let isRedundant = false;
            // ... (检查调号的逻辑不变) ...
            if (this.#currentKeySignature && this.#currentKeySignature.count > 0) {
                const sig = this.#currentKeySignature;
                if ((accidental === '#' || accidental === '𝄪') && sig.type === 'sharps') {
                    const sharpedNotes = MusicStaff.ORDER_OF_SHARPS.slice(0, sig.count);
                    if (sharpedNotes.includes(letter)) {
                        isRedundant = true; // (注意: 调号不会有重升)
                    }
                } else if ((accidental === 'b' || accidental === '𝄫') && sig.type === 'flats') {
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

        // 4. [!! 修复 !!] 动态 Left 位置 (逻辑不变)
        const hasKeySignature = (this.#currentKeySignature && this.#currentKeySignature.count > 0);
        const KEY_SIGNATURE_SPACE_SHIFT = 160; // (你的 160px)

        let noteLeftPx = 320;
        let ledgerLeftPx = 310;
        let accidentalLeftPx = 300;

        if (!hasKeySignature) {
            noteLeftPx -= KEY_SIGNATURE_SPACE_SHIFT;
            ledgerLeftPx -= KEY_SIGNATURE_SPACE_SHIFT;
            accidentalLeftPx -= KEY_SIGNATURE_SPACE_SHIFT;
        }

        // 5. [修改] 绘制谱加线 (逻辑不变)
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

        // 6. [修改] 绘制升降号 (逻辑不变)
        if (isAccidentalDrawn) {
            const accidentalEl = this.#createGlyph(
                'music-staff-accidental',
                accidentalGlyph,
                '2.5em' // (重升符号可能需要调整字体大小)
            );
            accidentalEl.style.top = `${finalTop}em`;
            accidentalEl.style.left = `${accidentalLeftPx}px`;
            this.#noteGroup.appendChild(accidentalEl);
        }

        // 7. [修改] 绘制音符 (逻辑不变)
        const stemUp = (position > 2.0);
        const noteGlyph = stemUp ? MusicStaff.NOTE_GLYPHS.STEM_UP : MusicStaff.NOTE_GLYPHS.STEM_DOWN;
        const noteEl = this.#createGlyph(
            'music-staff-note',
            noteGlyph,
            '3.5em'
        );
        noteEl.style.top = `${finalTop}em`;
        noteEl.style.left = `${noteLeftPx}px`;
        this.#noteGroup.appendChild(noteEl);
    }

    // =================================================================
    // =================== 4. [修改] 私有函数 ===========================
    // =================================================================

    /**
     * [修改] 绘制单根加线
     * (函数不变)
     */
    #drawLedgerLine(theoreticalPosition, leftPx) {
        const finalTop = theoreticalPosition;

        const line = document.createElement("div");
        line.className = "music-staff-ledger-line";
        line.style.top = `${finalTop}em`;
        line.style.left = `${leftPx}px`;

        this.#noteGroup.appendChild(line);
    }
}
