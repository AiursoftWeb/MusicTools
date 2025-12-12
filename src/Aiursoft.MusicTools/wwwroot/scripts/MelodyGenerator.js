import { Scale, Note } from "tonal";

/**
 * MelodyGenerator.js (Final Perfected Version)
 * * 修复核心：
 * 1. [Rhythm Integrity] 节奏模版严格遵守 4/4 拍数学 (Sum = 4)。
 * 2. [Separation of Concerns] _applyEnding 只修改音高，绝不篡改时值，彻底根治"缺拍/多拍"的怪异感。
 * 3. [Sparkle Sync] 钟声特效基于绝对时间轴，完美卡在反拍。
 */
export class MelodyGenerator {
    constructor(key = "C", scaleType = "major") {
        this.noteBuffer = [];
        const rawNotes = Scale.get(`${key} ${scaleType}`).notes;

        // Pre-calculate correct octaves for the scale to ensure it ascends
        // e.g. G Major: G, A, B, C, D, E, F# -> G4, A4, B4, C5, D5, E5, F#5
        this.scaleObjects = [];
        let currentOctave = 4;
        let previousMidi = -1;

        rawNotes.forEach(noteName => {
            // Tentatively try current octave
            let testMidi = Note.midi(`${noteName}${currentOctave}`);
            
            // If we wrapped around (e.g. B4 -> C4), bump octave
            // Logic: if new note is lower than previous, it must be in next octave
            // Exception: The first note is just reference
            if (previousMidi !== -1 && testMidi < previousMidi) {
                currentOctave++;
                testMidi = Note.midi(`${noteName}${currentOctave}`);
            }
            
            this.scaleObjects.push({
                name: noteName,
                baseOctave: currentOctave
            });
            previousMidi = testMidi;
        });

        // 锁定舒适音域 C4 - G5 (extended dynamically based on scale)
        this.minRange = 0; 
        this.maxRange = 14; // Approx 2 octaves
        
        // 钟声锚点：High C (7), Sol (4), High Sol (11)
        this.sparkleAnchors = [7, 4, 11]; 
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateSong();
        return this.noteBuffer.shift();
    }

    generateSong() {
        console.log("🎹 Generating Structurally Sound Melody...");

        // ==========================================
        // 1. 严格的 4拍 节奏模版
        // ==========================================
        // 所有数组的和必须严格等于 4.0
        const R = {
            // A. 常用模版
            CLASSIC: [1.5, 0.5, 1, 1],         // 4拍
            SYNCO:   [1, 0.5, 1, 0.5, 1],      // 4拍
            GALLOP:  [0.5, 0.5, 1, 0.5, 0.5, 1], // 4拍
            
            // B. 跑动模版
            RUN:     [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], // 4拍

            // C. 结尾模版 (Cadence)
            // 关键修正：这里定义好节奏，后面只填音
            // [1, 1, 2] -> 哒 哒 哐—— (正好4拍，适合唱 3-2-1)
            END_STD: [1, 1, 2], 
        };

        // ==========================================
        // 2. 生成乐句 (Phrases)
        // ==========================================

        // --- Phrase A (起) ---
        // [变] + [变] + [变] + [稳]
        const motifHead = this._randomChoose([R.CLASSIC, R.SYNCO, R.GALLOP]);
        const rhythmA = [...motifHead, ...motifHead, ...motifHead, ...R.END_STD];

        const phraseA = this._generateSmartPath({
            rhythm: rhythmA,
            startPitch: 0, 
            endPitch: Math.random() > 0.5 ? 4 : 1, // 停在 Sol 或 Re
            contour: "ARCH",
            useSparkle: false
        });

        // --- Phrase A' (承) ---
        // 克隆 A，只改最后 3 个音的音高 (因为 END_STD 有 3 个音)
        const phraseAPrime = JSON.parse(JSON.stringify(phraseA));
        // 中间用下行解决 (3-2-1)
        this._applyEnding(phraseAPrime, 0, "FALLING"); 

        // --- Phrase B (转) ---
        // [跑] + [跑] + [跑] + [稳]
        const rhythmB = [...R.RUN, ...R.RUN, ...R.RUN, ...R.END_STD];
        
        // 50% 概率开启钟声
        const triggerSparkle = Math.random() > 0.5;

        const phraseB = this._generateSmartPath({
            rhythm: rhythmB, 
            startPitch: 7, // High C
            endPitch: 4,   // Sol
            contour: "DOWN",
            useSparkle: triggerSparkle
        });

        // --- Phrase A'' (合) ---
        const phraseAFinal = JSON.parse(JSON.stringify(phraseA));
        
        // 50% 概率昂扬结尾 (1-3-5-High1) 或 低沉结尾 (3-2-1)
        const endingType = Math.random() > 0.5 ? "RISING" : "FALLING";
        this._applyEnding(phraseAFinal, 0, endingType);

        // ==========================================
        // 3. 组装
        // ==========================================
        this._addToBuffer(phraseA, true);      
        this._addToBuffer(phraseAPrime, true); 
        this._addToBuffer(phraseB, true);      
        this._addToBuffer(phraseAFinal, true); 
    }

    // ==========================================
    //       ✨ 智能路径生成 (核心逻辑) ✨
    // ==========================================
    _generateSmartPath({ rhythm, startPitch, endPitch, contour, useSparkle }) {
        let notes = [];
        const totalNotes = rhythm.length;
        
        // 时间轴追踪器 (用于精准定位反拍)
        let currentBeatTime = 0; 
        const anchorPitch = this._randomChoose(this.sparkleAnchors); 

        for (let i = 0; i < totalNotes; i++) {
            const dur = rhythm[i];
            let nextPitch;
            
            // 判断反拍 (x.5)
            const isOffBeat = (currentBeatTime % 1 === 0.5);

            // --- 1. 钟声特效 ---
            if (useSparkle && isOffBeat && dur === 0.5 && i < totalNotes - 1) {
                nextPitch = anchorPitch;
            } 
            else {
                // --- 2. 正常旋律 ---
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

            // --- 3. 修正与清洗 ---
            // 物理限制
            if (nextPitch < this.minRange) nextPitch = this.minRange + (this.minRange - nextPitch);
            if (nextPitch > this.maxRange) nextPitch = this.maxRange - (nextPitch - this.maxRange);

            const isSparkleNote = (nextPitch === anchorPitch && isOffBeat);
            
            // 防复读 (烫手山芋)
            if (!isSparkleNote && i > 0 && nextPitch === notes[i-1].scaleIndex && dur < 1) {
                if (nextPitch < this.maxRange) nextPitch += 1; else nextPitch -= 1;
            }

            // 防绊脚 (跑动级进)
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

            currentBeatTime += dur;
        }
        return notes;
    }

    /**
     * 强制修改乐句最后几个音的"音高"，但不修改"时值"
     * 依赖于 R.END_STD 是 [1, 1, 2] 这种 3 音结构的模版
     */
    _applyEnding(phrase, targetPitchIndex, type = "FALLING") {
        const len = phrase.length;
        if (len < 3) return;

        // 注意：这里我们只改 pitch, 不改 duration！
        // 因为 duration 已经在 R.END_STD 里定义完美了 (1+1+2=4)

        if (type === "RISING") {
            // 昂扬: Do(1) -> Mi(1) -> Sol(2) ... 哎呀不对，要更有力一点
            // 改为: Mi(1) -> Sol(1) -> High Do(2)
            
            // 倒数第3个
            phrase[len-3].scaleIndex = 2; // Mi
            phrase[len-3].midi = this._toMidi(2);
            phrase[len-3].name = this._toName(2);
            
            // 倒数第2个
            phrase[len-2].scaleIndex = 4; // Sol
            phrase[len-2].midi = this._toMidi(4);
            phrase[len-2].name = this._toName(4);

            // 倒数第1个 (目标 High Do)
            phrase[len-1].scaleIndex = 7; // High C
            phrase[len-1].midi = this._toMidi(7);
            phrase[len-1].name = this._toName(7);
            
        } else {
            // 低沉: Mi(1) -> Re(1) -> Do(2)
            
            phrase[len-3].scaleIndex = 2; // Mi
            phrase[len-3].midi = this._toMidi(2);
            phrase[len-3].name = this._toName(2);
            
            phrase[len-2].scaleIndex = 1; // Re
            phrase[len-2].midi = this._toMidi(1);
            phrase[len-2].name = this._toName(1);

            phrase[len-1].scaleIndex = targetPitchIndex; // Do
            phrase[len-1].midi = this._toMidi(targetPitchIndex);
            phrase[len-1].name = this._toName(targetPitchIndex);
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
        const scaleLen = this.scaleObjects.length;
        const normalizedIndex = ((index % scaleLen) + scaleLen) % scaleLen;
        const octaveShift = Math.floor(index / scaleLen);
        
        const noteObj = this.scaleObjects[normalizedIndex];
        const finalOctave = noteObj.baseOctave + octaveShift;
        const fullNoteName = noteObj.name + finalOctave;
        
        return { name: fullNoteName, midi: Note.midi(fullNoteName) };
    }
    
    _randomChoose(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}