/* =================================================================
 * == interval-exam.js
 * - [!! 修改 !!] 完全可本地化
 * - 依赖一个 "localizedStrings" 对象被注入
 * ================================================================= */

// --- 1. 核心音乐数据 (不变) ---

const NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10,
    'Cb': 11, 'Fb': 4, 'E#': 5
};

const SEMITONE_TO_NOTE = [
    { sharp: 'C', flat: 'C' },     // 0
    { sharp: 'C#', flat: 'Db' },   // 1
    { sharp: 'D', flat: 'D' },     // 2
    { sharp: 'D#', flat: 'Eb' },   // 3
    { sharp: 'E', flat: 'Fb' },     // 4
    { sharp: 'E#', flat: 'F' },     // 5
    { sharp: 'F#', flat: 'Gb' },   // 6
    { sharp: 'G', flat: 'G' },     // 7
    { sharp: 'G#', flat: 'Ab' },   // 8
    { sharp: 'A', flat: 'A' },     // 9
    { sharp: 'A#', flat: 'Bb' },   // 10
    { sharp: 'B', flat: 'Cb' }      // 11
];

const NOTE_LETTER_TO_DEGREE = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
const DEGREE_TO_NOTE_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// [!! 修改 !!]
// INTERVALS 现在使用编程键 (e.g., "p1", "m2")
// 本地化名称 (e.g., "Perfect Unison") 将从外部注入
const INTERVAL_DEFINITIONS = {
    'p1': { semis: 0,  degree: 1 },
    'm2': { semis: 1,  degree: 2 },
    'M2': { semis: 2,  degree: 2 },
    'm3': { semis: 3,  degree: 3 },
    'M3': { semis: 4,  degree: 3 },
    'p4': { semis: 5,  degree: 4 },
    'a4': { semis: 6,  degree: 4 }, // 增四
    'd5': { semis: 6,  degree: 5 }, // 减五
    'p5': { semis: 7,  degree: 5 },
    'm6': { semis: 8,  degree: 6 }, // 小六
    'a5': { semis: 8,  degree: 5 }, // 增五
    'M6': { semis: 9,  degree: 6 },
    'm7': { semis: 10, degree: 7 },
    'M7': { semis: 11, degree: 7 },
    'p8': { semis: 12, degree: 8 }
};
// [!! 修改 !!]
const INTERVAL_KEYS = Object.keys(INTERVAL_DEFINITIONS);

const EXAM_PITCHES = [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C#4', 'Eb4', 'F#4', 'G#4', 'Bb4'
];

// --- 2. 核心考试逻辑 (已重构) ---

class ExamQuestion {
    #questionStaff;
    #answerStaffs;
    #answerElements;
    #questionLabel;
    #correctAnswerPitch;
    #localizedStrings; // <--- [新]

    /**
     * [!! 修改 !!] 构造函数现在接收本地化字符串
     */
    constructor(questionStaff, answerStaffs, answerElements, questionLabel, localizedStrings) {
        this.#questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#answerElements = answerElements;
        this.#questionLabel = questionLabel;
        this.#localizedStrings = localizedStrings; // <--- [新]
        this.#correctAnswerPitch = null;

        this.#answerElements.forEach(element => {
            element.addEventListener('click', this.#handleAnswerClick.bind(this));
        });
    }

    /**
     * [!! 修改 !!] 使用本地化的 alert
     */
    #handleAnswerClick(event) {
        const clickedPitch = event.currentTarget.dataset.pitch;
        if (!clickedPitch) return;

        if (clickedPitch === this.#correctAnswerPitch) {
            alert(this.#localizedStrings.correct); // <--- [新]
            this.nextQuestion();
        } else {
            alert(this.#localizedStrings.wrong); // <--- [新]
        }
    }

    /**
     * 核心功能：计算 (音1 + 音程) -> 音2
     * (不变)
     */
    calculateInterval(basePitch, interval) {
        // ... (此函数 100% 不变)
        const baseLetter = basePitch.charAt(0);
        const baseAccidental = basePitch.length > 2 ? basePitch.charAt(1) : '';
        const baseOctave = parseInt(basePitch.slice(baseAccidental.length + 1), 10);
        const basePitchName = baseLetter + baseAccidental;
        const baseSemitone = NOTE_TO_SEMITONE[basePitchName];
        if (baseSemitone === undefined) {
            console.error(`无法解析 basePitchName: ${basePitchName} (来自 ${basePitch})`);
            return "C4";
        }
        const targetSemitone_raw = baseSemitone + interval.semis;
        const targetSemitone = targetSemitone_raw % 12;
        const baseDegree = NOTE_LETTER_TO_DEGREE[baseLetter];
        const targetDegree = (baseDegree + interval.degree - 1) % 7;
        const targetLetter = DEGREE_TO_NOTE_LETTER[targetDegree];
        const targetOctave = baseOctave + Math.floor((baseDegree + interval.degree - 1) / 7);
        const possibleNotes = SEMITONE_TO_NOTE[targetSemitone];
        let finalPitchName;
        if (possibleNotes.sharp.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.sharp;
        } else if (possibleNotes.flat.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.flat;
        } else {
            finalPitchName = possibleNotes.sharp;
        }
        return finalPitchName + targetOctave;
    }

    /**
     * [!! 修改 !!] 使用本地化的
     */
    nextQuestion() {
        // 1. 随机选择一个基础音高
        const basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];

        // 2. [!! 修改 !!] 随机选择一个音程 *键*
        const intervalKey = INTERVAL_KEYS[Math.floor(Math.random() * INTERVAL_KEYS.length)];
        const interval = INTERVAL_DEFINITIONS[intervalKey];
        // [新] 从本地化对象中查找名称
        const localizedIntervalName = this.#localizedStrings.intervals[intervalKey];

        // 3. 计算正确答案
        this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);

        // 4. 生成错误答案
        const wrongAnswers = this.generateWrongAnswers(basePitch, interval, this.#correctAnswerPitch);

        // 5. 将答案随机分配到3个 staff 上
        const allAnswers = [this.#correctAnswerPitch, ...wrongAnswers];
        this.shuffleArray(allAnswers);

        // --- 调试日志 (不变) ---
        console.clear();
        console.group("--- 🎵 考试题目调试信息 🎵 ---");
        console.log(`题目 (Question): ${basePitch} 的 ${localizedIntervalName} 是？`);
        console.log(`✅ 计算出的正确答案 (Correct): ${this.#correctAnswerPitch}`);
        console.log(`❌ 生成的错误答案 (Wrong): ${wrongAnswers.join(', ')}`);
        console.log("--- 答案分配 (Assignment) ---");
        console.log(`   ➡️ 答案 1 (ID: ${this.#answerElements[0].id}) 设为: ${allAnswers[0]} ${allAnswers[0] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 2 (ID: ${this.#answerElements[1].id}) 设为: ${allAnswers[1]} ${allAnswers[1] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 3 (ID: ${this.#answerElements[2].id}) 设为: ${allAnswers[2]} ${allAnswers[2] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.groupEnd();

        // 6. 更新视图 (DOM)
        for (let i = 0; i < this.#answerStaffs.length; i++) {
            this.#answerStaffs[i].showNote(allAnswers[i]);
            this.#answerElements[i].dataset.pitch = allAnswers[i];
        }

        this.#questionStaff.showNote(basePitch);

        // [!! 修改 !!] 使用本地化的模板
        this.#questionLabel.innerText = this.#localizedStrings.questionTemplate.replace('(0)', localizedIntervalName);
    }

    /**
     * 生成两个“聪明”的错误答案
     * (不变)
     */
    generateWrongAnswers(basePitch, interval, correctAnswer) {
        const wrongAnswers = new Set();

        // 错误答案 1: 错误的音程
        try {
            // [!! 修改 !!] 使用新的定义
            const currentIntervalKey = Object.keys(INTERVAL_DEFINITIONS).find(key => INTERVAL_DEFINITIONS[key] === interval);
            const wrongIntervalKey = INTERVAL_KEYS.find(key => key !== currentIntervalKey);
            const wrongInterval = INTERVAL_DEFINITIONS[wrongIntervalKey];

            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch (e) { console.error("Error generating wrong answer 1:", e); }

        // 错误答案 2: 异名同音
        try {
            const correctSemitoneRaw = NOTE_TO_SEMITONE[correctAnswer.slice(0, -1)];
            if(correctSemitoneRaw === undefined) throw new Error(`Cannot find semitone for ${correctAnswer.slice(0, -1)}`);

            const correctSemitone = correctSemitoneRaw % 12;
            const possibleNotes = SEMITONE_TO_NOTE[correctSemitone];
            const octave = correctAnswer.slice(-1);

            let enharmonicAnswer = null;
            if (correctAnswer.includes('#') && possibleNotes.flat !== possibleNotes.sharp) {
                enharmonicAnswer = possibleNotes.flat + octave;
            } else if (correctAnswer.includes('b') && possibleNotes.sharp !== possibleNotes.flat) {
                enharmonicAnswer = possibleNotes.sharp + octave;
            }

            if (enharmonicAnswer && enharmonicAnswer !== correctAnswer) {
                wrongAnswers.add(enharmonicAnswer);
            }
        } catch (e) { console.error("Error generating wrong answer 2:", e); }

        // 如果错误答案不够，用完全随机的音高填充
        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer) {
                wrongAnswers.add(randomPitch);
            }
        }

        return Array.from(wrongAnswers);
    }

    /** 辅助函数：随机打乱数组 (不变) */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
