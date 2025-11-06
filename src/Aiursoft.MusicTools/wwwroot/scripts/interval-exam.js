/* =================================================================
 * == interval-exam.js
 * - [!! 终极修复 !!] 更改了 INTERVAL_DEFINITIONS 的键以匹配 HTML
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


// [!! 终极修复 !!]
// 键 (Key) 必须与 HTML data- 属性 (和 <script> 块) 匹配
const INTERVAL_DEFINITIONS = {
    'p1': { semis: 0,  degree: 1 },
    'm2': { semis: 1,  degree: 2 },
    'maj2': { semis: 2,  degree: 2 }, // <--- 修复 (M2 -> maj2)
    'm3': { semis: 3,  degree: 3 },
    'maj3': { semis: 4,  degree: 3 }, // <--- 修复 (M3 -> maj3)
    'p4': { semis: 5,  degree: 4 },
    'a4': { semis: 6,  degree: 4 },
    'd5': { semis: 6,  degree: 5 },
    'p5': { semis: 7,  degree: 5 },
    'm6': { semis: 8,  degree: 6 },
    'a5': { semis: 8,  degree: 5 },
    'maj6': { semis: 9,  degree: 6 }, // <--- 修复 (M6 -> maj6)
    'm7': { semis: 10, degree: 7 },
    'maj7': { semis: 11, degree: 7 }, // <--- 修复 (M7 -> maj7)
    'p8': { semis: 12, degree: 8 }
};
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
    #localizedStrings;

    constructor(questionStaff, answerStaffs, answerElements, questionLabel, localizedStrings) {
        this.#questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#answerElements = answerElements;
        this.#questionLabel = questionLabel;
        this.#localizedStrings = localizedStrings;
        this.#correctAnswerPitch = null;

        this.#answerElements.forEach(element => {
            element.addEventListener('click', this.#handleAnswerClick.bind(this));
        });
    }

    #handleAnswerClick(event) {
        const clickedPitch = event.currentTarget.dataset.pitch;
        if (!clickedPitch) return;

        if (clickedPitch === this.#correctAnswerPitch) {
            alert(this.#localizedStrings.correct);
            this.nextQuestion();
        } else {
            alert(this.#localizedStrings.wrong);
        }
    }

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

    nextQuestion() {
        // 1. (不变)
        const basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];

        // 2. (不变) 使用了新的 (maj2) 键
        const intervalKey = INTERVAL_KEYS[Math.floor(Math.random() * INTERVAL_KEYS.length)];
        const interval = INTERVAL_DEFINITIONS[intervalKey];
        const localizedIntervalName = this.#localizedStrings.intervals[intervalKey];

        // 3. (不变)
        this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);

        // 4. (不变)
        const wrongAnswers = this.generateWrongAnswers(basePitch, interval, this.#correctAnswerPitch);

        // 5. (不变)
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

        // 6. (不变)
        for (let i = 0; i < this.#answerStaffs.length; i++) {
            this.#answerStaffs[i].showNote(allAnswers[i]);
            this.#answerElements[i].dataset.pitch = allAnswers[i];
        }

        this.#questionStaff.showNote(basePitch);

        // [!! 修复 !!] 修复了你的拼写错误 (0) -> {0}
        this.#questionLabel.innerText = this.#localizedStrings.questionTemplate.replace('(0)', localizedIntervalName);
    }

    generateWrongAnswers(basePitch, interval, correctAnswer) {
        const wrongAnswers = new Set();
        try {
            const currentIntervalKey = Object.keys(INTERVAL_DEFINITIONS).find(key => INTERVAL_DEFINITIONS[key] === interval);
            const wrongIntervalKey = INTERVAL_KEYS.find(key => key !== currentIntervalKey);
            const wrongInterval = INTERVAL_DEFINITIONS[wrongIntervalKey];
            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch (e) { console.error("Error generating wrong answer 1:", e); }
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
        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer) {
                wrongAnswers.add(randomPitch);
            }
        }
        return Array.from(wrongAnswers);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
