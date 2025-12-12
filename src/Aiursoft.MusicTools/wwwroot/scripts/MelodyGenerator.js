import { Scale, Note } from "tonal";

/**
 * MelodyGenerator.js (Time-Synced Sparkle Edition)
 * * 修复核心：
 * 1. [Fix Sparkle Sync] 抛弃 index 奇偶判断，改用 currentBeatTime (时间轴) 判断。
 * 确保钟声永远落在反拍 (x.5) 上，无论中间有没有长音干扰。
 * 2. [Polished Rhythm] 保持了丰富的节奏型和呼吸感。
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major") {
        this.noteBuffer = [];
        this.scaleNotes = Scale.get(`${key} ${scaleType}`).notes;
        this.minRange = 0; 
        this.maxRange = 14; 
        
        // 钟声锚点：High C (7), Sol (4), High Sol (11)
        this.sparkleAnchors = [7, 4, 11]; 
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateSong();
        return this.noteBuffer.shift();
    }

    generateSong() {
        console.log("💎 Generating Time-Synced Melody...");

        const R = {
            CLASSIC: [1.5, 0.5, 1, 1], 
            SYNCO:   [1, 0.5, 1, 0.5, 1],
            GALLOP:  [0.5, 0.5, 1, 0.5, 0.5, 1],
            STEADY:  [1, 1, 2],
            // 跑动带呼吸：哒哒哒哒 哒哒 (空)
            RUN_BREATH: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], 
        };

        // --- Phrase A (起) ---
        const motifHead = this._randomChoose([R.CLASSIC, R.SYNCO, R.GALLOP]);
        const rhythmA = [...motifHead, ...motifHead, ...motifHead, ...R.STEADY];

        const phraseA = this._generateSmartPath({
            rhythm: rhythmA,
            startPitch: 0, 
            endPitch: Math.random() > 0.5 ? 4 : 1, 
            contour: "ARCH",
            useSparkle: false 
        });

        // --- Phrase A' (承) ---
        const phraseAPrime = JSON.parse(JSON.stringify(phraseA));
        this._applyEnding(phraseAPrime, 0, 2, "FALLING"); 

        // --- Phrase B (转 - 高潮) ---
        // 确保 B 段节奏适合发挥钟声特效 (多用 0.5)
        const rhythmB = [...R.RUN_BREATH, ...R.RUN_BREATH, ...R.RUN_BREATH, ...R.STEADY];
        
        // 50% 概率开启钟声
        const triggerSparkle = Math.random() > 0.0; // Debug: 设为 >0.0 方便你测试，实际建议 >0.3

        const phraseB = this._generateSmartPath({
            rhythm: rhythmB, 
            startPitch: 7, // High C
            endPitch: 4,   // Sol
            contour: "DOWN",
            useSparkle: triggerSparkle
        });

        // --- Phrase A'' (合) ---
        const phraseAFinal = JSON.parse(JSON.stringify(phraseA));
        const endingType = Math.random() > 0.5 ? "RISING" : "FALLING";
        this._applyEnding(phraseAFinal, 0, 4, endingType);

        // 组装
        this._addToBuffer(phraseA, true);      
        this._addToBuffer(phraseAPrime, true); 
        this._addToBuffer(phraseB, true);      
        this._addToBuffer(phraseAFinal, true); 
    }

    // ==========================================
    //       ✨ 智能路径 (时间轴修复版) ✨
    // ==========================================
    _generateSmartPath({ rhythm, startPitch, endPitch, contour, useSparkle }) {
        let notes = [];
        const totalNotes = rhythm.length;
        
        // **关键修复：引入时间轴追踪**
        let currentBeatTime = 0; 

        // 随机选一个高音锚点
        const anchorPitch = this._randomChoose(this.sparkleAnchors); 

        for (let i = 0; i < totalNotes; i++) {
            const dur = rhythm[i];
            let nextPitch;
            
            // 判断当前是不是"反拍" (0.5, 1.5, 2.5...)
            // 只有在反拍，且时值为短音时，才允许变成钟声
            const isOffBeat = (currentBeatTime % 1 === 0.5);

            // --- 钟声逻辑 ---
            if (useSparkle && isOffBeat && dur === 0.5 && i < totalNotes - 1) {
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

            // 防复读 (仅针对非钟声的音符)
            // 如果上一个音不是钟声(或者即使是)，且当前算出来的音重复了，且是短音 -> 移位
            // 注意：如果当前已经是 Sparkle (nextPitch === anchorPitch)，则允许重复(虽然 Sparkle 通常很高不太会和旋律重叠)
            const isSparkleNote = (nextPitch === anchorPitch && isOffBeat);
            if (!isSparkleNote && i > 0 && nextPitch === notes[i-1].scaleIndex && dur < 1) {
                if (nextPitch < this.maxRange) nextPitch += 1; else nextPitch -= 1;
            }

            // 防绊脚 (跑动时保持级进)
            if (!isSparkleNote && i > 0 && dur === 0.5 && notes[i-1].duration === 0.5) {
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

            // **关键：累加时间**
            currentBeatTime += dur;
        }
        return notes;
    }

    _applyEnding(phrase, targetPitchIndex, finalDuration, type = "FALLING") {
        const len = phrase.length;
        if (len < 3) return;

        phrase[len-1].scaleIndex = targetPitchIndex;
        phrase[len-1].midi = this._toMidi(targetPitchIndex);
        phrase[len-1].name = this._toName(targetPitchIndex);
        phrase[len-1].duration = finalDuration;

        if (type === "RISING") {
            phrase[len-2].scaleIndex = 4; phrase[len-2].midi = this._toMidi(4); phrase[len-2].name = this._toName(4); phrase[len-2].duration = 1;
            phrase[len-3].scaleIndex = 2; phrase[len-3].midi = this._toMidi(2); phrase[len-3].name = this._toName(2); phrase[len-3].duration = 1;
            phrase[len-1].scaleIndex = 7; phrase[len-1].midi = this._toMidi(7); phrase[len-1].name = this._toName(7);
        } else {
            phrase[len-2].scaleIndex = 1; phrase[len-2].midi = this._toMidi(1); phrase[len-2].name = this._toName(1); phrase[len-2].duration = 1;
            phrase[len-3].scaleIndex = 2; phrase[len-3].midi = this._toMidi(2); phrase[len-3].name = this._toName(2); phrase[len-3].duration = 1;
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