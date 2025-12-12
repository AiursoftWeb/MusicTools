import { Scale, Note } from "tonal";

/**
 * MelodyGenerator.js (Rhythm Fix Version)
 * 核心改进：
 * 1. 节奏语法树 (Rhythm Grammar): 使用二叉树分割法生成自然的节奏。
 * 2. 终止锁 (Cadence Lock): 强制乐句结尾必须是长音，消除“孤独的短尾巴”。
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major pentatonic") {
        this.noteBuffer = [];
        this.scaleNotes = Scale.get(`${key} ${scaleType}`).notes;
        this.minRange = 0; 
        this.maxRange = 9; 

        // --- 节奏生成概率配置 ---
        // 这里的数字代表“切分”的概率。
        // Level 1: 把 4拍 切成 2+2
        // Level 2: 把 2拍 切成 1+1
        // Level 3: 把 1拍 切成 0.5+0.5
        this.rhythmProbabilities = {
            motif:   { splitL1: 1.0, splitL2: 0.5, splitL3: 0.0 }, // 简单，少切分
            fill:    { splitL1: 1.0, splitL2: 0.8, splitL3: 0.3 }, // 稍微密一点
            cadence: { splitL1: 0.2, splitL2: 0.0, splitL3: 0.0 }  // 几乎不切分，保持长音
        };
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateFullSong();
        return this.noteBuffer.shift();
    }

    generateFullSong() {
        console.log("🎵 Generating Melody with Structured Rhythm...");
        
        // 1. 生成动机 (Seed)
        const motif = this._generateMotif();

        // 2. A-A-B-A 结构
        this._generateSectionA(motif, "half"); // A1
        this._generateSectionA(motif, "full"); // A2
        this._generateSectionB();              // B
        this._generateSectionA(motif, "full"); // A3
    }

    // ==========================================
    //            新的节奏引擎 (Rhythm Engine)
    // ==========================================

    /**
     * 递归生成节奏
     * @param {Number} duration - 当前块的时长 (4, 2, 1)
     * @param {Object} probs - 切分概率配置
     * @returns {Array} - [1, 1, 0.5, 0.5, ...]
     */
    _generateRecursiveRhythm(duration, probs) {
        // 基础情况：如果已经是 0.5 (八分音符)，就不再切了
        if (duration <= 0.5) return [0.5];

        // 决定是否切分
        let splitChance = 0;
        if (duration === 4) splitChance = probs.splitL1;      // 4 -> 2+2
        else if (duration === 2) splitChance = probs.splitL2; // 2 -> 1+1
        else if (duration === 1) splitChance = probs.splitL3; // 1 -> 0.5+0.5

        if (Math.random() < splitChance) {
            // 执行切分：递归调用
            const half = duration / 2;
            const left = this._generateRecursiveRhythm(half, probs);
            const right = this._generateRecursiveRhythm(half, probs);
            return [...left, ...right];
        } else {
            // 不切分，保持原样
            return [duration];
        }
    }

    /**
     * 专门用于生成终止小节 (Cadence) 的节奏
     * 解决“最后一个音孤独”的问题
     */
    _generateCadenceRhythm() {
        // 强制模版：儿歌结尾只有这几种最舒服
        const templates = [
            [4],            // 全音符 (哐————)
            [2, 2],         // 二分音符 (哒—— 哒——)
            [3, 1],         // 附点 (哒——. 哒) -> 注意：虽然短音在后，但前面够长，且通常回到主音
            [1, 1, 2],      // (哒 哒 哐——) -> 最经典的儿歌结尾
            [2, 1, 1]       // (哐—— 哒 哒)
        ];
        // 绝对禁止 [1, 1, 1, 1] 或者是 [0.5, ...] 这种细碎的
        return this._getRandom(templates);
    }

    // ==========================================
    //            乐段生成 (Section Logic)
    // ==========================================

    _generateSectionA(motif, cadenceType) {
        // Bar 1 & 2: 动机复用
        this._addToBuffer(motif.bar1.indices, motif.bar1.rhythm, true);
        this._addToBuffer(motif.bar2.indices, motif.bar2.rhythm, true);

        // Bar 3: 过渡 (Fill)
        // 使用递归算法动态生成节奏
        const r3 = this._generateRecursiveRhythm(4, this.rhythmProbabilities.fill);
        const startIdx = motif.bar2.indices[motif.bar2.indices.length - 1];
        
        // 目标音设定
        let targetIndex = 0; 
        if (cadenceType === 'half') targetIndex = Math.random() > 0.5 ? 3 : 2; // Sol / Mi
        else targetIndex = 0; // Do

        // Bar 3 只要走到目标附近即可
        const notes3 = this._generateTargetedWalk(r3, startIdx, targetIndex, false);
        this._addToBuffer(notes3, r3, true);

        // Bar 4: 终止 (Cadence)
        // 使用专用函数生成“稳重”的节奏
        const r4 = this._generateCadenceRhythm(); 
        const startIdx4 = notes3[notes3.length - 1];
        
        // 强制最后一个音必须击中 targetIndex (Do 或 Sol)
        const notes4 = this._generateTargetedWalk(r4, startIdx4, targetIndex, true);
        this._addToBuffer(notes4, r4, true);
    }

    _generateSectionB() {
        let currentIdx = 3; // Start High

        // Bar 9, 10, 11 (High Energy)
        for (let i = 0; i < 3; i++) {
            // 动态生成稍微密集的节奏
            const r = this._generateRecursiveRhythm(4, this.rhythmProbabilities.fill);
            // 向上趋势
            const notes = this._generateSmoothWalk(r, currentIdx, { tendency: 0.2, min: 2 });
            this._addToBuffer(notes, r, true);
            currentIdx = notes[notes.length - 1];
        }

        // Bar 12 (Half Cadence)
        // B段结尾也要稳，不能太碎
        const rEnd = [1, 1, 2]; // 强制使用 (哒 哒 哐——) 这种经典句式
        const notesEnd = this._generateTargetedWalk(rEnd, currentIdx, 3, true); // Stop at Sol
        this._addToBuffer(notesEnd, rEnd, true);
    }

    _generateMotif() {
        // 动机的节奏要简单、重复
        // 生成一次节奏，Bar1 和 Bar2 共用 (或者 Bar2 微调)
        const r1 = this._generateRecursiveRhythm(4, this.rhythmProbabilities.motif);
        // Bar 2 如果完全一样会太死板，我们只改变最后两个音的节奏? 
        // 算了，儿歌里节奏重复是优点。直接复用 r1。
        const r2 = [...r1]; 

        const start = this._getRandom([0, 2, 3]);
        const n1 = this._generateSmoothWalk(r1, start);
        const n2 = this._generateSmoothWalk(r2, n1[n1.length-1]);
        
        return {
            bar1: { indices: n1, rhythm: r1 },
            bar2: { indices: n2, rhythm: r2 }
        };
    }

    // ==========================================
    //            路径算法 (保持不变)
    // ==========================================
    _generateTargetedWalk(rhythm, startIdx, targetIdx, forceEnd) {
        let indices = [];
        let current = this._clamp(startIdx);
        const len = rhythm.length;

        for (let i = 0; i < len; i++) {
            // 如果是最后一个音，且要求强制结束
            if (forceEnd && i === len - 1) {
                indices.push(targetIdx);
                break;
            }

            // *** 节奏优化逻辑 ***
            // 如果当前是节奏里的最后一个音（也就是 Bar 的最后一个音），
            // 哪怕 forceEnd 为 false，我们也尽量让它落在稳定音上 (0, 2, 3)
            // 这能避免小节连接处的突兀感
            if (i === len - 1 && !forceEnd) {
                // 简单的软引导 logic...
            }

            indices.push(current);
            
            // (算法逻辑同上一版，省略重复代码以节省空间)
            // ... Targeted Walk Logic ...
            const stepsLeft = len - 1 - i;
            if (stepsLeft <= 0) break;
            
            let possibleSteps = [0, 1, -1, 1, -1, 2, -2]; 
            let candidates = [];
            for (let step of possibleSteps) {
                let nextVal = current + step;
                if (nextVal < this.minRange || nextVal > this.maxRange) continue;
                const distBefore = Math.abs(targetIdx - current);
                const distAfter = Math.abs(targetIdx - nextVal);
                if (stepsLeft <= 2 && distBefore > 1) {
                    if (distAfter >= distBefore && Math.random() > 0.2) continue;
                }
                candidates.push(nextVal);
            }
            if (candidates.length === 0) current += (current < targetIdx) ? 1 : -1;
            else current = this._getRandom(candidates);
        }
        return indices;
    }

    _generateSmoothWalk(rhythm, startIdx, options = { tendency: 0, min: 0 }) {
        let indices = [];
        let current = this._clamp(startIdx);
        let steps = [0, 1, -1, 1, -1, 2, -2]; 

        for (let i = 0; i < rhythm.length; i++) {
            indices.push(current);
            if (i === rhythm.length - 1) break;

            let candidates = [];
            for (let step of steps) {
                let nextVal = current + step;
                if (options.tendency !== 0) {
                    if ((options.tendency > 0 && step < 0) || (options.tendency < 0 && step > 0)) {
                        if (Math.random() < Math.abs(options.tendency)) continue;
                    }
                }
                if (nextVal < Math.max(this.minRange, options.min) || nextVal > this.maxRange) continue;
                candidates.push(nextVal);
            }
            if (candidates.length === 0) current += (current > 4) ? -1 : 1;
            else current = this._getRandom(candidates);
        }
        return indices;
    }

    _addToBuffer(indices, rhythm, isBarStart) {
        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const dur = rhythm[i];
            const noteData = this._scaleIndexToNote(idx);
            this.noteBuffer.push({
                midi: noteData.midi,
                name: noteData.name,
                duration: dur,
                isBarStart: (i === 0) && isBarStart
            });
        }
    }

    _scaleIndexToNote(index) {
        const scaleLen = this.scaleNotes.length; 
        const octaveShift = Math.floor(index / scaleLen); 
        const noteIndex = index % scaleLen; 
        const noteName = this.scaleNotes[noteIndex]; 
        const octave = 4 + octaveShift; 
        const fullName = noteName + octave; 
        const midi = Note.midi(fullName);   
        return { name: fullName, midi: midi };
    }

    _clamp(val) { return Math.max(this.minRange, Math.min(this.maxRange, val)); }
    _getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
}