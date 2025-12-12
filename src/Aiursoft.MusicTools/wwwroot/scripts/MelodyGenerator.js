import { Scale, Note } from "tonal";

/**
 * MelodyGenerator.js (Professional Version)
 * 依赖: npm install tonal
 * * 核心策略：
 * 1. 结构：A-A-B-A (经典儿歌结构)
 * 2. 音阶：C Major Pentatonic (五声音阶) -> 彻底消除不和谐音程
 * 3. 算法：Targeted Random Walk (目标导向随机游走)
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major pentatonic") {
        this.noteBuffer = [];
        
        // --- 1. 初始化乐理引擎 (Tonal) ---
        // 获取五声音阶的所有音名: ["C", "D", "E", "G", "A"]
        // 五声音阶是儿歌的作弊码，没有半音，没有三全音，怎么组合都好听。
        this.scaleNotes = Scale.get(`${key} ${scaleType}`).notes;
        
        // 设定算法游走的“音级范围” (Scale Degrees)
        // 0 = C4, 1 = D4, ... 4 = A4, 5 = C5 (高八度)
        // 我们限制在两个八度内: 0 (Middle C) 到 9 (High A)
        this.minRange = 0; 
        this.maxRange = 9; 

        // --- 2. 节奏模式库 (总和必须为 4.0) ---
        this.rhythms = {
            // A. 动机 (朗朗上口)
            motif: [
                [1, 1, 1, 1],       // 哒 哒 哒 哒
                [1.5, 0.5, 1, 1],   // 哒. 哒 哒 哒
                [0.5, 0.5, 1, 2],   // 哒哒 哒 哐——
            ],
            // B. 填充 (流动感)
            fill: [
                [0.5, 0.5, 0.5, 0.5, 1, 1], // 密集跑动
                [1, 0.5, 0.5, 2],           // 简单连接
            ],
            // C. 终止 (呼吸感)
            cadence: [
                [4],            // 全音符
                [2, 2],         // 二分音符
                [3, 1],         // 附点二分
            ]
        };
    }

    /**
     * 对外接口：获取下一个音符数据
     * @returns {Object} { midi: 60, name: "C4", duration: 1.0, isBarStart: boolean }
     */
    getNextNote() {
        if (this.noteBuffer.length === 0) {
            this.generateFullSong();
        }
        return this.noteBuffer.shift();
    }

    // ==========================================
    //            宏观结构生成 (AABA)
    // ==========================================
    generateFullSong() {
        console.log("🎵 Generating Pentatonic Melody (AABA)...");

        // 1. 生成核心动机 (Seed)
        // Bar 1 & 2 是整首歌的 DNA
        const motif = this._generateMotif();

        // 2. A1段 (展示): 动机 -> 半终止 (停在 Sol 或 Mi)
        this._generateSectionA(motif, "half");

        // 3. A2段 (重复): 动机 -> 全终止 (回到 Do)
        this._generateSectionA(motif, "full");

        // 4. B段 (对比): 音高更高，节奏更密，不使用动机
        this._generateSectionB();

        // 5. A3段 (再现): 动机 -> 全终止
        this._generateSectionA(motif, "full");
    }

    _generateSectionA(motif, cadenceType) {
        // Bar 1 & 2: 复制动机
        this._addToBuffer(motif.bar1.indices, motif.bar1.rhythm, true);
        this._addToBuffer(motif.bar2.indices, motif.bar2.rhythm, true);

        // Bar 4 (目标): 确定我们要去哪
        // 五声音阶里：0=Do, 1=Re, 2=Mi, 3=Sol, 4=La, 5=HighDo
        let targetIndex = 0; // 默认为 Do (0)
        if (cadenceType === 'half') {
            targetIndex = Math.random() > 0.5 ? 3 : 2; // Sol(3) 或 Mi(2)
        } else {
            // 如果动机很高，就去 High Do (5)，否则去 Low Do (0)
            const lastNote = motif.bar2.indices[motif.bar2.indices.length - 1];
            targetIndex = lastNote > 3 ? 5 : 0;
        }

        // Bar 3 (桥梁): 从 Bar 2 结尾走到 Bar 4 目标附近
        const startIdx = motif.bar2.indices[motif.bar2.indices.length - 1];
        const r3 = this._getRandom(this.rhythms.fill);
        const notes3 = this._generateTargetedWalk(r3, startIdx, targetIndex, false);
        this._addToBuffer(notes3, r3, true);

        // Bar 4 (解决)
        const r4 = this._getRandom(this.rhythms.cadence);
        const startIdx4 = notes3[notes3.length - 1];
        const notes4 = this._generateTargetedWalk(r4, startIdx4, targetIndex, true);
        this._addToBuffer(notes4, r4, true);
    }

    _generateSectionB() {
        // B段从高处开始，通常是 Sol(3) 或 La(4)
        let currentIdx = 3; 

        // 连续生成3小节的“高潮”游走
        for (let i = 0; i < 3; i++) {
            const r = this._getRandom(this.rhythms.fill);
            // tendency: 0.3 (强行向上趋势), min: 2 (不低于 Mi)
            const notes = this._generateSmoothWalk(r, currentIdx, { tendency: 0.3, min: 2 });
            this._addToBuffer(notes, r, true);
            currentIdx = notes[notes.length - 1];
        }

        // B段最后一句：半终止，准备接回 A
        // 强行走到 Sol (3)
        const rEnd = this._getRandom(this.rhythms.cadence);
        const notesEnd = this._generateTargetedWalk(rEnd, currentIdx, 3, true);
        this._addToBuffer(notesEnd, rEnd, true);
    }

    _generateMotif() {
        const r1 = this._getRandom(this.rhythms.motif);
        const r2 = this._getRandom(this.rhythms.motif);
        
        // 从 Do(0), Mi(2), Sol(3) 开始
        const start = this._getRandom([0, 2, 3]);
        
        // 生成平滑的五声旋律
        const n1 = this._generateSmoothWalk(r1, start);
        const n2 = this._generateSmoothWalk(r2, n1[n1.length-1]);
        
        return {
            bar1: { indices: n1, rhythm: r1 },
            bar2: { indices: n2, rhythm: r2 }
        };
    }

    // ==========================================
    //            微观算法 (五声版)
    // ==========================================

    /**
     * 目标导向游走 (Pentatonic Version)
     * 注意：这里的 step=1 代表五声音阶的一级 (例如 C -> D)，
     * 实际听感已经是二度甚至三度(E->G)跳跃了，所以步子不需要迈太大。
     */
    _generateTargetedWalk(rhythm, startIdx, targetIdx, forceEnd) {
        let indices = [];
        let current = this._clamp(startIdx);
        const len = rhythm.length;

        for (let i = 0; i < len; i++) {
            if (forceEnd && i === len - 1) {
                indices.push(targetIdx);
                break;
            }

            indices.push(current);
            const stepsLeft = len - 1 - i;
            if (stepsLeft <= 0) break;

            // 候选步长：五声音阶里，step=1 已经很动听了，尽量避免 step=2(五度跳跃)
            let possibleSteps = [0, 1, -1, 1, -1, 2, -2]; 
            let candidates = [];

            for (let step of possibleSteps) {
                let nextVal = current + step;
                // 1. 范围检查
                if (nextVal < this.minRange || nextVal > this.maxRange) continue;

                // 2. 磁力引导
                const distBefore = Math.abs(targetIdx - current);
                const distAfter = Math.abs(targetIdx - nextVal);

                // 如果没时间了，必须靠近目标
                if (stepsLeft <= 2 && distBefore > 1) {
                    if (distAfter >= distBefore && Math.random() > 0.2) continue;
                }
                candidates.push(nextVal);
            }

            if (candidates.length === 0) {
                // 兜底：直接向目标挪一步
                current += (current < targetIdx) ? 1 : -1;
            } else {
                current = this._getRandom(candidates);
            }
        }
        return indices;
    }

    _generateSmoothWalk(rhythm, startIdx, options = { tendency: 0, min: 0 }) {
        let indices = [];
        let current = this._clamp(startIdx);
        let steps = [0, 1, -1, 1, -1, 2, -2]; // 五声音阶步长

        for (let i = 0; i < rhythm.length; i++) {
            indices.push(current);
            if (i === rhythm.length - 1) break;

            let candidates = [];
            for (let step of steps) {
                let nextVal = current + step;
                
                // 倾向性检查
                if (options.tendency !== 0) {
                    if ((options.tendency > 0 && step < 0) || (options.tendency < 0 && step > 0)) {
                        if (Math.random() < Math.abs(options.tendency)) continue;
                    }
                }
                
                if (nextVal < Math.max(this.minRange, options.min) || nextVal > this.maxRange) continue;
                candidates.push(nextVal);
            }

            if (candidates.length === 0) {
                current += (current > 4) ? -1 : 1; // 简单回弹
            } else {
                current = this._getRandom(candidates);
            }
        }
        return indices;
    }

    // ==========================================
    //            工具函数 & Tonal 转换
    // ==========================================

    _addToBuffer(indices, rhythm, isBarStart) {
        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const dur = rhythm[i];
            
            // 核心：将五声索引 (Scale Index) 转换为 真实乐理数据
            const noteData = this._scaleIndexToNote(idx);

            this.noteBuffer.push({
                midi: noteData.midi,      // 用于播放 (60, 62...)
                name: noteData.name,      // 用于显示 (C4, D4...)
                duration: dur,
                isBarStart: (i === 0) && isBarStart
            });
        }
    }

    /**
     * 将 0-9 的索引转换为具体的音高
     * 0 -> C4
     * 1 -> D4
     * ...
     * 5 -> C5
     */
    _scaleIndexToNote(index) {
        const scaleLen = this.scaleNotes.length; // 5
        const octaveShift = Math.floor(index / scaleLen); // 第几个八度
        const noteIndex = index % scaleLen; // 音阶内的第几个音
        
        const noteName = this.scaleNotes[noteIndex]; // e.g., "C", "G"
        const octave = 4 + octaveShift; // 基础八度从 4 开始
        
        const fullName = noteName + octave; // "C4", "G5"
        const midi = Note.midi(fullName);   // Tonal 帮我们要到了 MIDI 值
        
        return { name: fullName, midi: midi };
    }

    _clamp(val) { return Math.max(this.minRange, Math.min(this.maxRange, val)); }
    _getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
}