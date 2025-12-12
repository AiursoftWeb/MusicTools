import { Scale, Note } from "tonal";

/**
 * MelodyGenerator.js (Sparkle & Glory Edition)
 * * 新增特性：
 * 1. [Sparkle Effect] B段跑动引入"钟"式技巧：旋律音与固定锚点音交替，制造晶莹剔透的感觉。
 * 2. [Glory Ending] 结尾不再总是下行，增加"昂扬上行"模式 (Do-Mi-Sol-HighDo)，像烟花升空。
 * 3. [Structure] 保持完美的 AABA + 呼吸感。
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major") {
        this.noteBuffer = [];
        this.scaleNotes = Scale.get(`${key} ${scaleType}`).notes;
        this.minRange = 0; 
        this.maxRange = 14; 
        
        // 定义“钟声”的锚点音索引 (相对于 scaleNotes)
        // 7 = High C, 4 = Sol, 11 = High Sol
        this.sparkleAnchors = [7, 4, 11]; 
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateSong();
        return this.noteBuffer.shift();
    }

    generateSong() {
        console.log("✨ Generating Melody with Sparkle Run & Glory Ending...");

        // ==========================================
        // 1. 节奏库
        // ==========================================
        const R = {
            CLASSIC: [1.5, 0.5, 1, 1], 
            SYNCO:   [1, 0.5, 1, 0.5, 1],
            GALLOP:  [0.5, 0.5, 1, 0.5, 0.5, 1],
            STEADY:  [1, 1, 2],
            // 跑动：纯粹的八分音符，方便做"钟"式特效
            RUN_BREATH: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], 
        };

        // ==========================================
        // 2. 生成乐句
        // ==========================================

        // --- Phrase A (起) ---
        const motifHead = this._randomChoose([R.CLASSIC, R.SYNCO, R.GALLOP]);
        const rhythmA = [...motifHead, ...motifHead, ...motifHead, ...R.STEADY];

        const phraseA = this._generateSmartPath({
            rhythm: rhythmA,
            startPitch: 0, 
            endPitch: Math.random() > 0.5 ? 4 : 1, 
            contour: "ARCH",
            useSparkle: false // A段不需要特效，朴实一点
        });

        // --- Phrase A' (承) ---
        const phraseAPrime = JSON.parse(JSON.stringify(phraseA));
        // 中间用下行解决 (比较稳)
        this._applyEnding(phraseAPrime, 0, 2, "FALLING"); 

        // --- Phrase B (转 - 高潮) ---
        const rhythmB = [...R.RUN_BREATH, ...R.RUN_BREATH, ...R.RUN_BREATH, ...R.STEADY];
        
        // ** 关键特性：是否触发钟声特效？ **
        // 50% 概率触发类似《钟》或 Flower Dance 的效果
        const triggerSparkle = Math.random() > 0.3; 

        const phraseB = this._generateSmartPath({
            rhythm: rhythmB, 
            startPitch: 7, // High C
            endPitch: 4,   // Sol
            contour: "DOWN",
            useSparkle: triggerSparkle // 开启特效！
        });

        // --- Phrase A'' (合) ---
        const phraseAFinal = JSON.parse(JSON.stringify(phraseA));
        
        // ** 关键特性：结尾是低沉还是高昂？ **
        const endingType = Math.random() > 0.5 ? "RISING" : "FALLING";
        this._applyEnding(phraseAFinal, 0, 4, endingType);

        // ==========================================
        // 3. 组装
        // ==========================================
        this._addToBuffer(phraseA, true);      
        this._addToBuffer(phraseAPrime, true); 
        this._addToBuffer(phraseB, true);      
        this._addToBuffer(phraseAFinal, true); 
    }

    // ==========================================
    //       ✨ 智能路径 (含钟声特效) ✨
    // ==========================================
    _generateSmartPath({ rhythm, startPitch, endPitch, contour, useSparkle }) {
        let notes = [];
        const totalNotes = rhythm.length;

        // 如果开启特效，随机选一个锚点音 (比如 High C)
        // 所有的偶数音都会跳回这个锚点
        const anchorPitch = this._randomChoose(this.sparkleAnchors); 

        for (let i = 0; i < totalNotes; i++) {
            const dur = rhythm[i];
            let nextPitch;

            // --- 特效逻辑：钟声 (Sparkle) ---
            // 条件：开启特效 + 不是最后一个音 + 是偶数位 + 时值是短音(0.5)
            // 效果：强制跳回 anchorPitch
            if (useSparkle && i < totalNotes - 1 && i % 2 !== 0 && dur === 0.5) {
                nextPitch = anchorPitch;
            } 
            else {
                // --- 正常旋律逻辑 ---
                if (i === 0) nextPitch = startPitch;
                else if (i === totalNotes - 1) nextPitch = endPitch;
                else {
                    const progress = i / totalNotes;
                    let base = startPitch + (endPitch - startPitch) * progress;
                    
                    if (contour === "ARCH") base += Math.sin(progress * Math.PI) * 3;
                    if (contour === "DOWN") base += (Math.random() * 2 - 1);
                    
                    let drift = Math.floor(Math.random() * 5) - 2; 
                    nextPitch = Math.round(base + drift);
                }
            }

            // 物理限制
            if (nextPitch < this.minRange) nextPitch = this.minRange + (this.minRange - nextPitch);
            if (nextPitch > this.maxRange) nextPitch = this.maxRange - (nextPitch - this.maxRange);

            // 防复读 (仅当没开启特效时检查，因为特效本身就是复读)
            if (!useSparkle && i > 0 && nextPitch === notes[i-1].scaleIndex && dur < 1) {
                if (nextPitch < this.maxRange) nextPitch += 1; else nextPitch -= 1;
            }

            // 防绊脚 (仅当没开启特效时检查，特效本身就是大跳)
            if (!useSparkle && i > 0 && dur === 0.5 && notes[i-1].duration === 0.5) {
                const prevPitch = notes[i-1].scaleIndex;
                if (Math.abs(nextPitch - prevPitch) > 2) {
                    nextPitch = prevPitch + (nextPitch > prevPitch ? 1 : -1);
                }
            }

            notes.push({
                scaleIndex: nextPitch,
                midi: this._toMidi(nextPitch),
                name: this._toName(nextPitch),
                duration: dur
            });
        }
        return notes;
    }

    /**
     * 强制修改乐句结尾
     * @param {String} type "FALLING" (54321) 或 "RISING" (1351)
     */
    _applyEnding(phrase, targetPitchIndex, finalDuration, type = "FALLING") {
        const len = phrase.length;
        if (len < 3) return;

        // 最后一个音：目标音 (Do)
        phrase[len-1].scaleIndex = targetPitchIndex;
        phrase[len-1].midi = this._toMidi(targetPitchIndex);
        phrase[len-1].name = this._toName(targetPitchIndex);
        phrase[len-1].duration = finalDuration;

        if (type === "RISING") {
            // 昂扬结尾：Do -> Mi -> Sol -> High Do!
            // 倒数第2个：Sol (4)
            phrase[len-2].scaleIndex = 4;
            phrase[len-2].midi = this._toMidi(4);
            phrase[len-2].name = this._toName(4);
            phrase[len-2].duration = 1;

            // 倒数第3个：Mi (2)
            phrase[len-3].scaleIndex = 2;
            phrase[len-3].midi = this._toMidi(2);
            phrase[len-3].name = this._toName(2);
            phrase[len-3].duration = 1;
            
            // 如果最后一个音是 High Do (7)，我们手动改一下
            // 因为 targetPitchIndex 传进来通常是 0 (Low Do)
            // 这里我们强制升八度
            phrase[len-1].scaleIndex = 7; // High C
            phrase[len-1].midi = this._toMidi(7);
            phrase[len-1].name = this._toName(7);

        } else {
            // 低沉/常规结尾：Mi -> Re -> Do
            // 倒数第2个：Re (1)
            phrase[len-2].scaleIndex = 1;
            phrase[len-2].midi = this._toMidi(1);
            phrase[len-2].name = this._toName(1);
            phrase[len-2].duration = 1;

            // 倒数第3个：Mi (2)
            phrase[len-3].scaleIndex = 2;
            phrase[len-3].midi = this._toMidi(2);
            phrase[len-3].name = this._toName(2);
            phrase[len-3].duration = 1;
        }
    }

    _addToBuffer(notes, isBarStart) {
        notes.forEach((n, i) => {
            this.noteBuffer.push({ ...n, isBarStart: i === 0 && isBarStart });
        });
    }

    _toMidi(index) {
        let safeIndex = Math.max(0, index); 
        const noteInfo = this._scaleIndexToNote(safeIndex);
        return noteInfo.midi;
    }

    _toName(index) {
        let safeIndex = Math.max(0, index);
        const noteInfo = this._scaleIndexToNote(safeIndex);
        return noteInfo.name;
    }

    _scaleIndexToNote(index) {
        const scaleLen = this.scaleNotes.length;
        const normalizedIndex = ((index % scaleLen) + scaleLen) % scaleLen;
        const octaveShift = Math.floor(index / scaleLen);
        const noteName = this.scaleNotes[normalizedIndex];
        const octave = 4 + octaveShift;
        return { name: noteName + octave, midi: Note.midi(noteName + octave) };
    }
    
    _randomChoose(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}