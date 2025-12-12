/**
 * MelodyGenerator.js
 * * 一个基于结构化逻辑 (AABA Form) 和目标导向算法的儿歌旋律生成器。
 * 核心改进：
 * 1. 宏观结构：强制 A-A-B-A 结构，确保重复性和记忆点。
 * 2. 微观控制：引入 "Targeted Walk" (目标导向游走)，防止旋律瞎跑。
 * 3. 呼吸感：强制每4小节出现长音或休止，模拟人类呼吸。
 */

export class MelodyGenerator {
    constructor() {
        this.noteBuffer = []; // 存储生成的音符队列
        
        // 简易 C 大调自然音阶映射: 0=C4, 1=D4, ... 7=C5
        // 稳定音 (Chord Tones): Do, Mi, Sol, High Do
        this.stableNotes = [0, 2, 4, 7]; 

        // --- 节奏池 (Rhythm Patterns) ---
        // 所有模式的总时值必须严格等于 4.0 (4/4拍)
        this.rhythms = {
            // A. 动机模式 (Motif): 简单、重复、有记忆点
            motif: [
                [1, 1, 1, 1],       // 哒 哒 哒 哒 (最稳)
                [1.5, 0.5, 1, 1],   // 哒. 哒 哒 哒 (有点跃动感)
                [1, 1, 2],          // 哒 哒 哐—— (简单有力)
                [0.5, 0.5, 1, 1, 1] // 哒哒 哒 哒 哒 (欢快)
            ],
            // B. 填充模式 (Fill): 稍微密集一点，用于连接
            fill: [
                [1, 1, 1, 1],
                [0.5, 0.5, 1, 1, 1],
                [1, 0.5, 0.5, 1, 1],
                [0.5, 0.5, 0.5, 0.5, 2] // 跑动后停顿
            ],
            // C. 终止模式 (Cadence): 必须包含长音，给人喘息感
            cadence: [
                [4],            // 全音符 (最稳的结束)
                [2, 2],         // 二分音符
                [3, 1],         // 哒—— 哒
                [1, 1, 2]       // 哒 哒 哐——
            ]
        };
    }

    /**
     * 获取下一个音符
     * 如果缓冲区空了，就自动生成一整首新歌
     */
    getNextNote() {
        if (this.noteBuffer.length === 0) {
            this.generateFullSong();
        }
        return this.noteBuffer.shift();
    }

    /**
     * 核心流程：生成 A-A-B-A 结构的 16 小节
     */
    generateFullSong() {
        console.log("🎵 Generating New Song (A-A-B-A Structure)...");

        // 1. 设计核心动机 (The "Face" of the song)
        // 生成 Bar 1 & 2 的旋律和节奏。这将是整首歌的灵魂。
        const motifData = this._generateMotifBars();

        // 2. Phrase 1 (A1): 提出主题 -> 半终止 (悬念)
        // 结尾通常落在 2(Mi) 或 4(Sol)
        this._generateSectionA(motifData, "half");

        // 3. Phrase 2 (A2): 重复主题 -> 全终止 (解决)
        // 结尾必须落在 0(Do)
        this._generateSectionA(motifData, "full");

        // 4. Phrase 3 (B): 发展/对比 -> 半终止
        // 情绪高昂，节奏改变，最终悬停等待 A 回归
        this._generateSectionB();

        // 5. Phrase 4 (A3): 再现主题 -> 全终止
        // 完美的句号
        this._generateSectionA(motifData, "full");
    }

    // ====================================================
    //              乐段生成逻辑 (Section Logic)
    // ====================================================

    /**
     * 生成 A 段 (4小节)
     * 逻辑：复用动机(Bar1-2) -> 过渡(Bar3) -> 解决(Bar4)
     */
    _generateSectionA(motifData, cadenceType) {
        // --- Bar 1 & 2: 既然是 A 段，必须把动机搬出来 ---
        // 使用 true 标记这是一个新小节的开始
        this._addToBuffer(motifData.bar1.notes, motifData.bar1.rhythm, true);
        this._addToBuffer(motifData.bar2.notes, motifData.bar2.rhythm, true);

        // --- 规划 Bar 4 (目标) ---
        // 我们需要先知道终点在哪里，才能规划 Bar 3 怎么走过去
        let targetNote = 0; // 默认为 Do
        if (cadenceType === 'half') {
            // 半终止：去 Sol(4) 或 Mi(2)
            targetNote = Math.random() > 0.5 ? 4 : 2;
        } else {
            // 全终止：去 Do(0) 或 High Do(7)
            // 简单判断：如果 Bar 2 结束音很高，我们就去 High Do，否则回 Low Do
            const lastNoteOfBar2 = motifData.bar2.notes[motifData.bar2.notes.length - 1];
            targetNote = lastNoteOfBar2 > 4 ? 7 : 0;
        }

        // 选择一个带有“呼吸感”的终止节奏
        const r4 = this._getRandom(this.rhythms.cadence);
        
        // --- Bar 3: 过渡 (Bridge) ---
        // 任务：从 Bar 2 的结尾音，自然地走到 Bar 4 的目标音附近
        const startNodeBar3 = motifData.bar2.notes[motifData.bar2.notes.length - 1];
        const r3 = this._getRandom(this.rhythms.fill);
        
        // 生成 Bar 3，目标是 targetNote (或者 targetNote 的邻居)
        // forceEnd=false, 我们不需要 Bar 3 直接撞在 target 上，靠近就行
        const notes3 = this._generateTargetedWalk(r3, startNodeBar3, targetNote, false);
        this._addToBuffer(notes3, r3, true);

        // --- Bar 4: 解决 (Cadence) ---
        // 从 Bar 3 的结尾，稳稳地走到 targetNote
        const startNodeBar4 = notes3[notes3.length - 1];
        // forceEnd=true, 最后一个音必须严格等于 targetNote
        const notes4 = this._generateTargetedWalk(r4, startNodeBar4, targetNote, true); 
        this._addToBuffer(notes4, r4, true);
    }

    /**
     * 生成 B 段 (4小节)
     * 逻辑：对比。音区更高，节奏更密，不使用 A 段动机。
     */
    _generateSectionB() {
        // B段通常从属音 (Sol) 或高音区开始，制造紧张感
        let currentNote = 4; // Sol

        // Bar 9, 10, 11 (连续推进)
        for (let i = 0; i < 3; i++) {
            const r = this._getRandom(this.rhythms.fill);
            
            // tendency: 0.2 表示有 20% 的概率强制向上走，制造高潮
            // min: 2 表示限制最低音为 Mi，不让它掉得太低
            const notes = this._generateSmoothWalk(r, currentNote, { tendency: 0.2, min: 2 });
            
            this._addToBuffer(notes, r, true);
            currentNote = notes[notes.length - 1];
        }

        // Bar 12 (B段结尾)
        // 必须是一个半终止 (Half Cadence)，通常停在 Sol(4)，仿佛在问 "接下来呢？"
        const rEnd = this._getRandom(this.rhythms.cadence);
        // 从当前的音，走到 4 (Sol)
        const notesEnd = this._generateTargetedWalk(rEnd, currentNote, 4, true);
        this._addToBuffer(notesEnd, rEnd, true);
    }

    /**
     * 生成动机 (Seed)
     * 包含两个小节的旋律和节奏，作为 A 段的基础
     */
    _generateMotifBars() {
        const r1 = this._getRandom(this.rhythms.motif);
        const r2 = this._getRandom(this.rhythms.motif); // Bar 2 可以稍微不同，也可以一样
        
        // Bar 1: 从主和弦内音开始 (Do, Mi, Sol)
        const startNote = this._getRandom([0, 2, 4]);
        const n1 = this._generateSmoothWalk(r1, startNote);
        
        // Bar 2: 接龙，从 Bar 1 结尾继续走
        const n2 = this._generateSmoothWalk(r2, n1[n1.length-1]);

        return {
            bar1: { rhythm: r1, notes: n1 },
            bar2: { rhythm: r2, notes: n2 }
        };
    }

    // ====================================================
    //              算法核心：路径生成 (Pathfinding)
    // ====================================================

    /**
     * 目标导向游走 (The Magnet Walk)
     * 相比于随机游走，这个算法会计算“我离目标还有多远”以及“我还剩几步”。
     * 如果时间不够了，它会强制向目标靠拢。
     * * @param {Array} rhythmPattern - 节奏数组
     * @param {Number} startNote - 起始音高 (0-7)
     * @param {Number} targetNote - 目标音高 (0-7)
     * @param {Boolean} forceEnd - 是否强制最后一个音必须击中目标
     */
    _generateTargetedWalk(rhythmPattern, startNote, targetNote, forceEnd = false) {
        let notes = [];
        let current = this._clamp(startNote);
        const totalSteps = rhythmPattern.length;

        for (let i = 0; i < totalSteps; i++) {
            // 如果是最后一步且开启了强制结束
            if (forceEnd && i === totalSteps - 1) {
                notes.push(targetNote);
                break;
            }

            notes.push(current);

            const stepsLeft = totalSteps - 1 - i;
            if (stepsLeft <= 0) break; // 防止越界

            // --- 决策逻辑 ---
            let candidates = [];
            // 允许的步伐：原地，上下1度，上下3度(跳进)
            let possibleSteps = [0, 1, -1, 1, -1, 2, -2];

            for (let step of possibleSteps) {
                let nextVal = current + step;
                
                // 1. 物理边界检查 (0-7)
                if (nextVal < 0 || nextVal > 7) continue;
                
                // 2. 乐理检查：避免三全音 (F-B)
                // 3=F, 6=B. 这种跳跃在儿歌里太难听
                if ((current === 3 && nextVal === 6) || (current === 6 && nextVal === 3)) continue; 

                // 3. 磁力引导 (Magnetism)
                // 计算走这一步之后，离目标是近了还是远了
                const distBefore = Math.abs(targetNote - current);
                const distAfter = Math.abs(targetNote - nextVal);
                
                // 如果步数吃紧 (只剩2步以内)，且距离还很远
                if (stepsLeft <= 2 && distBefore > 1) {
                    // 拒绝那些让距离变大或不变的步伐
                    if (distAfter >= distBefore) {
                         // 给一个小概率(10%)允许反向跑，增加一点点“皮”的感觉，否则太死板
                         if (Math.random() > 0.1) continue;
                    }
                }
                candidates.push(nextVal);
            }

            // 兜底：如果所有候选都被过滤掉了 (死胡同)，或者列表为空
            if (candidates.length === 0) {
                // 直接向目标强行移动 1 格
                if (current < targetNote) candidates.push(current + 1);
                else if (current > targetNote) candidates.push(current - 1);
                else candidates.push(current);
            }

            // 从候选中随机选一个
            current = candidates[Math.floor(Math.random() * candidates.length)];
        }
        return notes;
    }

    /**
     * 平滑随机游走 (Smooth Random Walk)
     * 用于不需要强制目标的段落 (如 Motif 生成, B段过程)
     * @param {Object} options - { tendency: -1~1 (趋势), min: 0~7 (最低音限制) }
     */
    _generateSmoothWalk(rhythmPattern, startNote, options = { tendency: 0, min: 0 }) {
        let notes = [];
        let current = this._clamp(startNote);
        // 步长权重：大概率级进(1)，小概率跳进(2)
        const steps = [0, 1, -1, 1, -1, 1, -1, 2, -2]; 

        for (let i = 0; i < rhythmPattern.length; i++) {
            notes.push(current);
            if (i === rhythmPattern.length - 1) break;

            let candidates = [];
            for (let step of steps) {
                let nextVal = current + step;

                // 检查倾向性 (Tendency)
                // 如果 tendency > 0 (想往上走)，可以概率性丢弃向下的步伐
                if (options.tendency !== 0) {
                    if ((options.tendency > 0 && step < 0) || (options.tendency < 0 && step > 0)) {
                        // 这是一个简单的概率过滤器
                        if (Math.random() < Math.abs(options.tendency)) continue;
                    }
                }

                // 边界检查
                if (nextVal < options.min || nextVal > 7) continue; 
                // 三全音检查
                if ((current===3 && nextVal===6) || (current===6 && nextVal===3)) continue;
                
                candidates.push(nextVal);
            }

            // 兜底
            if (candidates.length === 0) {
                if (current > 4) candidates.push(current - 1); 
                else candidates.push(current + 1);
            }

            current = candidates[Math.floor(Math.random() * candidates.length)];
        }
        return notes;
    }

    // --- 辅助函数 ---
    
    // 限制数值在 0-7 之间
    _clamp(val) { return Math.max(0, Math.min(7, val)); }
    
    // 数组随机取样
    _getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    
    // 将生成的音符推入缓冲区
    _addToBuffer(notes, rhythm, isBarStart) {
        for (let i = 0; i < notes.length; i++) {
            this.noteBuffer.push({
                // 这里只存 0-7 的音级，播放时需要映射到 MIDI (例如 0->60, 1->62...)
                noteIndex: notes[i], 
                duration: rhythm[i],
                // 标记这是小节的第一个音，方便前端做可视化或重音处理
                isNewBar: (i === 0) && isBarStart 
            });
        }
    }
}