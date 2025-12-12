
/**
 * 旋律生成器核心模块
 * 用于生成符合 A-A'-B-C 结构的 4/4 拍旋律
 * 考试范围：一个八度 (Index 0 - 7)
 */
export class MelodyGenerator {
    constructor() {
        this.noteBuffer = []; // 待消费的音符队列
        this.scaleRange = [0, 1, 2, 3, 4, 5, 6, 7]; // 对应 1 2 3 4 5 6 7 1(高)
        
        // --- 节奏池配置 ---
        this.rhythms = {
            // 稳重型 (适合 Bar 1 & 2)
            start: [
                [1, 1, 1, 1],       // 咚 咚 咚 咚
                [2, 1, 1],          // 哐-- 咚 咚
                [1.5, 0.5, 1, 1],   // 附点起手
                [1, 1, 0.5, 0.5, 1] // 咚 咚 哒哒 咚
            ],
            // 流动型 (适合 Bar 3 - 搞事情)
            run: [
                [0.5, 0.5, 0.5, 0.5, 1, 1], // 跑跑跑跑 走 走
                [1, 0.5, 0.5, 1, 0.5, 0.5], // 走 跑跑 走 跑跑
                [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], // 密集跑动
                [1, 1, 0.5, 0.5, 0.5, 0.5]  // 走 走 跑跑跑跑
            ],
            // 终止型 (适合 Bar 4 - 收尾)
            end: [
                [1, 1, 2],    // 走 走 停--
                [2, 2],       // 慢-- 慢--
                [1.5, 0.5, 2],// 附点-- 停--
                [4]           // 全音符
            ]
        };
    }

    /**
     * 【外部调用接口】获取下一个音符
     * 考试器每次调用这个方法，如果没有库存了，会自动生成下一段 4 小节
     * @returns {Object} { noteIndex: 0-7, duration: 1.0, isBarStart: boolean }
     */
    getNextNote() {
        if (this.noteBuffer.length === 0) {
            this.generateNextBlock();
        }
        return this.noteBuffer.shift();
    }

    /**
     * 【内部核心】生成 4 小节乐句块 (A - A' - B - C)
     */
    generateNextBlock() {
        // --- 1. 生成 Bar 1 (A: 动机) ---
        const rhythmA = this._getRandom(this.rhythms.start);
        // Bar 1 从稳定音 (Do:0, Mi:2, Sol:4) 开始
        const startNoteA = [0, 2, 4][Math.floor(Math.random() * 3)];
        const notesA = this._generateWalk(rhythmA, startNoteA);
        this._addToBuffer(notesA, rhythmA, true); // true 标记为新乐句开始

        // --- 2. 生成 Bar 2 (A': 模仿/模进) ---
        // 节奏完全复用 Bar 1
        // 音高逻辑：有 70% 概率做“模进” (Sequence)，即整体 +1 或 -1
        let notesB = [];
        if (Math.random() > 0.3) {
            const shift = Math.random() > 0.5 ? 1 : -1;
            notesB = notesA.map(n => this._clamp(n + shift));
        } else {
            // 30% 概率重新生成，但接在 Bar 1 后面
            notesB = this._generateWalk(rhythmA, notesA[notesA.length - 1]);
        }
        this._addToBuffer(notesB, rhythmA, false);

        // --- 3. 生成 Bar 3 (B: 展开/高潮) ---
        const rhythmC = this._getRandom(this.rhythms.run);
        // 强制往高处走，增加紧张感
        const startNoteC = notesB[notesB.length - 1]; 
        const notesC = this._generateWalk(rhythmC, startNoteC, { tendency: 0.3 }); // tendency > 0 倾向向上
        this._addToBuffer(notesC, rhythmC, false);

        // --- 4. 生成 Bar 4 (C: 解决/终止) ---
        const rhythmD = this._getRandom(this.rhythms.end);
        // 生成除去最后一个音的旋律
        const notesD_Part = this._generateWalk(rhythmD.slice(0, -1), notesC[notesC.length - 1]);
        
        // --- 关键：强行构建终止式 (Cadence) ---
        // 最后一个音必须是主音 (0 或 7)
        const lastNote = Math.random() > 0.5 ? 0 : 7; 
        
        // 倒数第二个音 (导音) 修正
        if (notesD_Part.length > 0) {
            // 如果最后一个音是高音Do(7)，前一个音最好是 Si(6) 或 Re(高八度无，用Sol(4))
            // 如果最后一个音是低音Do(0)，前一个音最好是 Re(1) 或 Ti(低八度无，用Sol(4))
            const prevIndex = notesD_Part.length - 1;
            if (lastNote === 7) notesD_Part[prevIndex] = 6; // Si -> Do
            else notesD_Part[prevIndex] = 1; // Re -> Do
        }
        
        const notesD = [...notesD_Part, lastNote];
        this._addToBuffer(notesD, rhythmD, false);
        
        console.log("Generated new 4-bar melody block.");
    }

    // --- 算法辅助函数 ---

    /**
     * 随机游走算法生成音高序列
     * @param {Array} rhythmPattern 节奏数组
     * @param {Number} startNote 起始音 index
     * @param {Object} options { tendency: 0.0 } // 倾向性，正数向上，负数向下
     */
    _generateWalk(rhythmPattern, startNote, options = { tendency: 0 }) {
        let notes = [];
        let current = startNote;
        
        for (let i = 0; i < rhythmPattern.length; i++) {
            notes.push(current);
            
            // 决定下一步怎么走
            // 权重：[保持(10%), 级进±1(60%), 跳进±2(20%), 大跳(10%)]
            let step = 0;
            const r = Math.random();
            
            if (r < 0.1) step = 0;
            else if (r < 0.7) step = Math.random() > 0.5 ? 1 : -1;
            else if (r < 0.9) step = Math.random() > 0.5 ? 2 : -2;
            else step = Math.random() > 0.5 ? 3 : -3;

            // 应用倾向性 (让旋律往上或往下跑)
            if (options.tendency !== 0) {
                if (Math.random() < Math.abs(options.tendency)) {
                    step = options.tendency > 0 ? Math.abs(step) : -Math.abs(step);
                }
            }

            current = this._clamp(current + step);
        }
        return notes;
    }

    _clamp(val) {
        return Math.max(0, Math.min(7, val));
    }

    _getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _addToBuffer(notes, rhythm, isBarStart) {
        for (let i = 0; i < notes.length; i++) {
            this.noteBuffer.push({
                noteIndex: notes[i], // 0-7
                duration: rhythm[i], // 1.0, 0.5, etc.
                isNewBar: (i === 0)  // 标记是否是小节的第一个音(用于UI显示小节线)
            });
        }
    }
}
