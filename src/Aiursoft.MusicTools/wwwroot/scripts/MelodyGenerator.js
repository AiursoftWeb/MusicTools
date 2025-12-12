import { Algorithmic, Utility } from "total-serialism";
import { Scale, Note } from "tonal";

const Algo = Algorithmic;
const Util = Utility;

/**
 * MelodyGenerator.js (8-Step Grid & Big Leaps)
 * * 核心改革：
 * 1. 【物理降速】将计算网格从 16 改为 8。这意味着最小单位是八分音符 (0.5)。
 * 0.25 (十六分音符) 被彻底物理消除。
 * 2. 【解锁大跳】允许旋律跨越 3-4 个音级 (五度/八度跳跃)，不再只是爬楼梯。
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major pentatonic") {
        this.noteBuffer = [];
        this.scaleNotes = Scale.get(`${key} ${scaleType}`).notes;
        this.minRange = 0; 
        this.maxRange = 9; 
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateSong();
        return this.noteBuffer.shift();
    }

    generateSong() {
        console.log("🧸 Generating Nursery Rhyme (8-Step Grid)...");

        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomChoose = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // ==========================================
        // 1. 节奏骨架 (8-Step Grid)
        // ==========================================
        // 以前是 16 格 (1格=0.25)。现在是 8 格 (1格=0.5)。
        // 这意味着整个小节只有 8 个位置可以放音符。
        
        // A段: 极简。8格里敲 3-4 下。
        // 结果通常是：二分音符 + 两个四分音符，非常稳。
        const hitsA = randomInt(3, 4); 
        let rhythmPatternA = Algo.euclid(hitsA, 8); // 注意这里是 8
        rhythmPatternA = this._ensureStart(rhythmPatternA, 8); 

        // B段: 稍微活跃。8格里敲 5-6 下。
        // 结果通常是：连续的八分音符 (0.5)，但绝对不会有 0.25。
        const hitsB = randomInt(5, 6);
        let rhythmPatternB = Algo.euclid(hitsB, 8); // 注意这里是 8
        rhythmPatternB = this._ensureStart(rhythmPatternB, 8);

        const durationsA = this._euclidToDurations(rhythmPatternA, 8);
        const durationsB = this._euclidToDurations(rhythmPatternB, 8);

        // ==========================================
        // 2. 旋律灵魂 (Big Jumps Allowed)
        // ==========================================

        // A 段
        const melodyA = this._generateTargetedWalk({
            steps: durationsA.length, 
            start: 0, 
            target: randomChoose([2, 3]), 
            forceEnd: false
        });

        // A' 段 (回家)
        const melodyAPrime = this._generateTargetedWalk({
            steps: durationsA.length,
            start: 0,
            target: 0, 
            forceEnd: true
        });

        // B 段 (高潮，大跳跃)
        const melodyB = this._generateTargetedWalk({
            steps: durationsB.length,
            start: randomChoose([3, 4]), 
            target: 3, 
            min: 2,    
            tendency: 0.1 
        });

        // ==========================================
        // 3. 组装
        // ==========================================
        
        this._addToBuffer(melodyA, durationsA, true);       
        this._addToBuffer(melodyAPrime, durationsA, true);  
        this._addToBuffer(melodyB, durationsB, true);       
        this._addToBuffer(melodyAPrime, durationsA, true);  

        // 结尾长音
        this.noteBuffer.push({
            midi: Note.midi(`${this.scaleNotes[0]}4`),
            name: `${this.scaleNotes[0]}4`,
            duration: 4, 
            isBarStart: true
        });
    }

    // ==========================================
    //       ✨ 胆子更大的磁力游走 ✨
    // ==========================================
    _generateTargetedWalk({ steps, start, target, min=0, tendency=0, forceEnd=false }) {
        let indices = [];
        let current = this._clamp(Number(start)); 

        for (let i = 0; i < steps; i++) {
            if (forceEnd && i === steps - 1) {
                indices.push(target);
                break;
            }
            indices.push(current);

            const stepsLeft = steps - 1 - i;
            if (stepsLeft <= 0) break;

            // --- 关键修改：允许大跳 ---
            // 0: 原地
            // 1, -1: 二度 (级进)
            // 2, -2: 三度 (小跳)
            // 3, -3: 四/五度 (大跳 - Twinkle Twinkle 开头)
            // 4, -4: 六/八度 (巨大跳)
            let possibleSteps = [0, 1, -1, 1, -1, 2, -2, 2, -2, 3, -3, 4, -4]; 
            let candidates = [];

            for (let step of possibleSteps) {
                let nextVal = current + step;
                if (nextVal < Math.max(this.minRange, min) || nextVal > this.maxRange) continue;
                
                // 磁力逻辑 (接近目标)
                const distBefore = Math.abs(target - current);
                const distAfter = Math.abs(target - nextVal);
                
                // 如果只剩最后一步，且距离还远，必须用力跳过去
                if (stepsLeft <= 1 && distBefore > 2) {
                     // 必须缩短距离
                     if (distAfter >= distBefore) continue;
                }
                // 如果只剩2步，稍微宽容一点
                else if (stepsLeft <= 2 && distBefore > 1) {
                     if (distAfter >= distBefore && Math.random() > 0.3) continue;
                }
                
                candidates.push(nextVal);
            }

            if (candidates.length === 0) current += (current < target) ? 1 : -1;
            else current = candidates[Math.floor(Math.random() * candidates.length)];
        }
        return indices;
    }

    // ==========================================
    //            工具函数 (适配 8步网格)
    // ==========================================

    _euclidToDurations(pattern, totalSteps) {
        let result = [];
        let count = 0;
        for (let i = 1; i < pattern.length; i++) {
            count++;
            if (pattern[i] === 1) {
                result.push(count);
                count = 0;
            }
        }
        result.push(count + 1);
        
        // 修正总长度
        const total = result.reduce((a,b)=>a+b, 0);
        if (total !== totalSteps) result[result.length-1] += (totalSteps-total);
        
        return result;
    }

    _ensureStart(pattern, size) {
        let p = [...pattern];
        // 保护：防止空数组
        if (!p.includes(1)) {
            let empty = new Array(size).fill(0);
            empty[0] = 1;
            return empty;
        }
        while (p[0] === 0) p = Util.rotate(p, -1);
        return p;
    }

    _addToBuffer(noteIndices, durations, isBarStart) {
        const len = Math.min(noteIndices.length, durations.length);
        for (let i = 0; i < len; i++) {
            const idx = noteIndices[i];
            
            // --- 关键修改：乘数变化 ---
            // 以前 1 step = 0.25 (16分音符)
            // 现在 1 step = 0.5 (8分音符)
            let dur = durations[i] * 0.5; 
            
            const noteData = this._scaleIndexToNote(idx);
            if (!isNaN(noteData.midi)) {
                this.noteBuffer.push({
                    midi: noteData.midi,
                    name: noteData.name,
                    duration: dur,
                    isBarStart: (i === 0) && isBarStart
                });
            }
        }
    }

    _scaleIndexToNote(index) {
        if (isNaN(index)) return { name: "C4", midi: 60 };
        const scaleLen = this.scaleNotes.length;
        const normalizedIndex = ((index % scaleLen) + scaleLen) % scaleLen;
        const octaveShift = Math.floor(index / scaleLen);
        const noteName = this.scaleNotes[normalizedIndex];
        const octave = 4 + octaveShift;
        return { name: noteName + octave, midi: Note.midi(noteName + octave) };
    }

    _clamp(val) { return Math.max(this.minRange, Math.min(this.maxRange, val)); }
}