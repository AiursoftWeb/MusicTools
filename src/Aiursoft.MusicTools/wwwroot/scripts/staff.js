/* =================================================================
 * REFACTORED: staff.js
 * * - 借用 ScaleVisualizerEngine 中的 createStaff 逻辑
 * - 使用相对的 'em' 单位，不再使用硬编码的像素
 * - 使用音乐字体绘制音符和升降号
 * ================================================================= */

/**
 * 定义音高在五线谱上的相对位置（以 'em' 为单位）。
 * 0em 是最上面的那条线。
 * 4em 是最下面的那条线。
 */
const CSS_VERTICAL_OFFSET_EM = 1.7;

const STAFF_POSITIONS = {
    // 高音谱表 (Treble Clef) - G4 在第二线 (1em)
    treble: {
        'C': 5,    // C4 (下加一线)
        'D': 4.5,  // D4 (下加一间)
        'E': 4,    // E4 (第一线)
        'F': 3.5,
        'G': 3,
        'A': 2.5,
        'B': 2
    },
    // 低音谱表 (Bass Clef) - F3 在第四线 (3em)
    bass: {
        'C': 6,    // C2 (下加二线)
        'D': 5.5,
        'E': 5,    // E2 (第一线)
        'F': 4.5,
        'G': 4,
        'A': 3.5,
        'B': 3
    }
};

const CLEF_GLYPHS = {
    treble: { glyph: '\uE050', top: '2.7em', size: '4em' }, // G-clef
    bass:   { glyph: '\uE062', top: '0.7em', size: '4em' }  // F-clef
};

const ACCIDENTAL_GLYPHS = {
    '#': '\uE262', // Sharp
    'b': '\uE260', // Flat
    '': ''         // Natural
};

class Staff {
    #container;
    #staffWrapper;
    #noteElement;
    #accidentalElement;
    #clefType;
    // (pitchName) => void
    #clickHandler;

    /**
     * @param {string} containerId
     * @param {'treble' | 'bass'} clefType
     */
    constructor(containerId, clefType = 'treble') {
        this.#container = document.getElementById(containerId);
        if (!this.#container) {
            console.error(`Staff container not found: ${containerId}`);
            return;
        }

        this.#clefType = clefType;
        this.#container.innerHTML = ''; // 清空
        this.#staffWrapper = this.#createStaffDOM(clefType);

        // 创建音符和升降号的“插槽”
        this.#accidentalElement = this.#createGlyphElement('accidental', '', '2.5em');
        this.#noteElement = this.#createGlyphElement('note', '', '3.5em');

        // 注意：升降号必须在音符之前添加到 DOM 中
        this.#staffWrapper.appendChild(this.#accidentalElement);
        this.#staffWrapper.appendChild(this.#noteElement);

        this.#container.appendChild(this.#staffWrapper);

        // 绑定点击事件
        this.#container.addEventListener('click', () => {
            if (this.#clickHandler) {
                // 我们将在 ExamQuestion 中设置这个 pitch
                this.#clickHandler(this.pitch);
            }
        });
    }

    /**
     * (从 ScaleVisualizerEngine 借用的)
     * 创建五线谱和谱号的 DOM 结构
     */
    #createStaffDOM(clefType) {
        const wrapper = document.createElement("div");
        wrapper.className = "staff-wrapper position-relative"; // 确保音符可以定位

        // 5条线
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "staff-line";
            line.style.top = `${i}em`;
            wrapper.appendChild(line);
        }

        // 谱号
        const clefInfo = CLEF_GLYPHS[clefType];
        const clefPositioner = document.createElement("span");
        clefPositioner.className = "clef";
        clefPositioner.style.top = clefInfo.top;
        clefPositioner.style.left = "5px";

        const clefGlyph = document.createElement("span");
        clefGlyph.textContent = clefInfo.glyph;
        clefGlyph.style.fontSize = clefInfo.size;

        clefPositioner.appendChild(clefGlyph);
        wrapper.appendChild(clefPositioner);
        return wrapper;
    }

    /**
     * 创建一个用于显示字形的 span 元素
     */
    #createGlyphElement(className, text, fontSize) {
        const positioner = document.createElement("span");
        positioner.className = className;
        positioner.style.position = 'absolute';
        positioner.style.left = '100px'; // 默认X位置 (升降号)

        const glyph = document.createElement("span");
        glyph.textContent = text;
        glyph.style.fontSize = fontSize;

        positioner.appendChild(glyph);
        return positioner;
    }
    /**
     * 【已修复】设置要显示的音高
     * @param {string} pitch (e.g., "C4", "F#5", "Eb3")
     */
    setPitch(pitch) {
        if (!pitch) {
            this.#noteElement.style.visibility = 'hidden';
            this.#accidentalElement.style.visibility = 'hidden';
            return;
        }

        this.pitch = pitch; // 存储音高

        // --- 1. 解析音高 (这是之前缺失的部分) ---
        const letter = pitch.charAt(0).toUpperCase(); // 'F'
        const accidental = pitch.length > 2 && (pitch.charAt(1) === '#' || pitch.charAt(1) === 'b')
            ? pitch.charAt(1)
            : ''; // '#'
        const octave = parseInt(pitch.slice(accidental.length + 1), 10); // 5  <-- 修复 ReferenceError

        // --- 2. 找到基础 'em' 位置 (这也是之前缺失的部分) ---
        const basePosition = STAFF_POSITIONS[this.#clefType][letter];

        // 3. 根据八度进行调整 (这也是之前缺失的部分)
        const referenceOctave = this.#clefType === 'treble' ? 4 : 2;
        const octaveDifference = octave - referenceOctave;

        // 理论位置 (e.g., G4 = 3em)
        const position = basePosition - (octaveDifference * 3.5);

        // --- 4. 核心修复：添加 CSS 补偿 ---
        const finalTop = position + CSS_VERTICAL_OFFSET_EM;
        // --- 修复结束 ---

        // 5. 更新音符
        // 规则: 高音谱表的中线 B4 (position 2.0em) 及以上的音，符干向下
        const stemUp = (position > 2.0); // 符干方向基于 *理论位置*
        const noteGlyph = stemUp ? '\uE1D5' : '\uE1D6';
        this.#noteElement.querySelector('span').textContent = noteGlyph;

        // 应用 *补偿后* 的 Top
        this.#noteElement.style.top = `${finalTop}em`;
        this.#noteElement.style.left = '120px';
        this.#noteElement.style.visibility = 'visible';

        // 6. 更新升降号
        const accidentalGlyph = ACCIDENTAL_GLYPHS[accidental];
        this.#accidentalElement.querySelector('span').textContent = accidentalGlyph;

        // 应用 *补偿后* 的 Top
        this.#accidentalElement.style.top = `${finalTop}em`;
        this.#accidentalElement.style.left = '95px';
        this.#accidentalElement.style.visibility = accidentalGlyph ? 'visible' : 'hidden';
    }

    onclick(handler) {
        this.#clickHandler = handler;
    }
}
