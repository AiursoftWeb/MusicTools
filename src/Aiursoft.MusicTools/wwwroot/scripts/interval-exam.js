/* =================================================================
 * REFACTORED: interval-exam.js
 * * - 实现了 (音1, 音程) -> 音2 的正确逻辑
 * - 包含了12个音高的完整数据
 * - 随机生成问题和答案
 * ================================================================= */

// --- 1. 核心音乐数据 ---

// 12个音高及其半音值 (以C为0)
const NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10
};

// 半音值到音高的映射 (用于查找结果)
// 我们优先使用升号键 (sharp) 还是降号键 (flat)
const SEMITONE_TO_NOTE = [
    { sharp: 'C', flat: 'C' },     // 0
    { sharp: 'C#', flat: 'Db' },   // 1
    { sharp: 'D', flat: 'D' },     // 2
    { sharp: 'D#', flat: 'Eb' },   // 3
    { sharp: 'E', flat: 'E' },     // 4
    { sharp: 'F', flat: 'F' },     // 5
    { sharp: 'F#', flat: 'Gb' },   // 6
    { sharp: 'G', flat: 'G' },     // 7
    { sharp: 'G#', flat: 'Ab' },   // 8
    { sharp: 'A', flat: 'A' },     // 9
    { sharp: 'A#', flat: 'Bb' },   // 10
    { sharp: 'B', flat: 'B' }      // 11
];

// 音名对应的音级 (C=0, D=1, ... B=6)
const NOTE_LETTER_TO_DEGREE = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
const DEGREE_TO_NOTE_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// 音程定义：{ 半音数, 度数 }
// 度数 (degree) 对于确定正确的音名 (C, D, F#...) 至关重要
const INTERVALS = {
    '小三度 (Minor Third)':   { semis: 3, degree: 3 },
    '大三度 (Major Third)':   { semis: 4, degree: 3 },
    '纯四度 (Perfect Fourth)': { semis: 5, degree: 4 },
    '增四度 (Augmented Fourth)': { semis: 6, degree: 4 },
    '减五度 (Diminished Fifth)': { semis: 6, degree: 5 },
    '纯五度 (Perfect Fifth)':   { semis: 7, degree: 5 },
    '增五度 (Augmented Fifth)': { semis: 8, degree: 5 }
};
const INTERVAL_NAMES = Object.keys(INTERVALS);

// 考试用的音高范围 (高音谱表)
const EXAM_PITCHES = [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C#4', 'Eb4', 'F#4', 'G#4', 'Bb4'
];

// --- 2. 核心考试逻辑 ---

class ExamQuestion {
    #questionStaff;
    #answerStaffs;
    #questionLabel;
    #correctAnswerPitch; // e.g., "G#4"

    constructor(questionStaff, answerStaffs, questionLabel) {
        this.#questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#questionLabel = questionLabel;

        // 为每个答案 staff 绑定点击处理器
        this.#answerStaffs.forEach(staff => {
            staff.onclick((clickedPitch) => {
                if (clickedPitch === this.#correctAnswerPitch) {
                    alert('正确! (Correct!)');
                    this.nextQuestion(); // 进入下一题
                } else {
                    alert('错误。 (Wrong.)');
                }
            });
        });
    }

    /**
     * 核心功能：计算 (音1 + 音程) -> 音2
     * @param {string} basePitch (e.g., "C4")
     * @param {object} interval (e.g., { semis: 7, degree: 5 })
     * @returns {string} (e.g., "G4")
     */
    calculateInterval(basePitch, interval) {
        // 1. 解析基础音高
        const baseLetter = basePitch.charAt(0);
        const baseAccidental = basePitch.length > 2 ? basePitch.charAt(1) : '';
        const baseOctave = parseInt(basePitch.slice(baseAccidental.length + 1), 10);
        const basePitchName = baseLetter + baseAccidental;

        // 2. 计算目标半音
        const baseSemitone = NOTE_TO_SEMITONE[basePitchName];
        const targetSemitone_raw = baseSemitone + interval.semis;
        const targetSemitone = targetSemitone_raw % 12;

        // 3. 计算目标音名 (C, D, E...)
        // (这是最关键的一步，用于处理异名同音)
        const baseDegree = NOTE_LETTER_TO_DEGREE[baseLetter];
        // interval.degree 是 1-based (三度=3), 所以 -1
        const targetDegree = (baseDegree + interval.degree - 1) % 7;
        const targetLetter = DEGREE_TO_NOTE_LETTER[targetDegree]; // e.g., 'G'

        // 4. 计算目标八度
        // 如果音高跨越了 C (e.g., A -> C)，八度 + 1
        const targetOctave = baseOctave + Math.floor(targetSemitone_raw / 12);

        // 5. 组合答案：找到与目标音名 (targetLetter) 匹配的半音
        const possibleNotes = SEMITONE_TO_NOTE[targetSemitone]; // e.g., { sharp: 'F#', flat: 'Gb' }

        let finalPitchName;
        if (possibleNotes.sharp.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.sharp;
        } else if (possibleNotes.flat.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.flat;
        } else {
            // C 和 F 这种自然音
            finalPitchName = possibleNotes.sharp;
        }

        return finalPitchName + targetOctave; // e.g., "G#4"
    }

    nextQuestion() {
        // 1. 随机选择一个基础音高
        const basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];

        // 2. 随机选择一个音程
        const intervalName = INTERVAL_NAMES[Math.floor(Math.random() * INTERVAL_NAMES.length)];
        const interval = INTERVALS[intervalName];

        // 3. 计算正确答案
        this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);

        // 4. 生成错误答案
        const wrongAnswers = this.generateWrongAnswers(basePitch, interval, this.#correctAnswerPitch);

        // 5. 将答案随机分配到3个 staff 上
        const allAnswers = [this.#correctAnswerPitch, ...wrongAnswers];
        this.shuffleArray(allAnswers);


        // --- ⬇️ 这里是新增的调试日志 ⬇️ ---

        console.clear(); // 清空控制台，方便阅读
        console.group("--- 🎵 考试题目调试信息 🎵 ---");

        console.log(`题目 (Question): ${basePitch} 的 ${intervalName} 是？`);
        console.log(`✅ 计算出的正确答案 (Correct): ${this.#correctAnswerPitch}`);
        console.log(`❌ 生成的错误答案 (Wrong): ${wrongAnswers.join(', ')}`);

        console.log("--- 答案分配 (Assignment) ---");
        // 我们假设 this.#answerStaffs 的顺序与 HTML 对应
        console.log(`   ➡️ 答案 1 (ID: staff-answer1-container) 设为: ${allAnswers[0]} ${allAnswers[0] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 2 (ID: staff-answer2-container) 设为: ${allAnswers[1]} ${allAnswers[1] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 3 (ID: staff-answer3-container) 设为: ${allAnswers[2]} ${allAnswers[2] === this.#correctAnswerPitch ? ' (✅)' : ''}`);

        console.groupEnd();

        // --- ⬆️ 调试日志结束 ⬆️ ---


        // 6. 更新视图 (DOM)
        for (let i = 0; i < this.#answerStaffs.length; i++) {
            this.#answerStaffs[i].setPitch(allAnswers[i]);
        }

        this.#questionStaff.setPitch(basePitch);
        this.#questionLabel.innerText = `上方音符的 ${intervalName} 是？`;
    }

    /**
     * 生成两个“聪明”的错误答案
     */
    generateWrongAnswers(basePitch, interval, correctAnswer) {
        const wrongAnswers = new Set(); // 使用 Set 避免重复

        // 错误答案 1: 错误的音程 (e.g., 大三度 -> 小三度)
        try {
            const wrongIntervalName = INTERVAL_NAMES.find(name => name !== INTERVAL_NAMES[interval]);
            const wrongInterval = INTERVALS[wrongIntervalName];
            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch(e) {}

        // 错误答案 2: 异名同音 (e.g., F# -> Gb)
        // (这是一个简化的实现，仅用于演示)
        if (correctAnswer.includes('#')) {
            const letter = correctAnswer.charAt(0);
            const octave = correctAnswer.slice(2);
            const semi = (NOTE_TO_SEMITONE[letter] + 1) % 12;
            wrongAnswers.add(SEMITONE_TO_NOTE[semi].flat + octave);
        } else if (correctAnswer.includes('b')) {
            const letter = correctAnswer.charAt(0);
            const octave = correctAnswer.slice(2);
            const semi = (NOTE_TO_SEMITONE[letter] - 1 + 12) % 12;
            wrongAnswers.add(SEMITONE_TO_NOTE[semi].sharp + octave);
        }

        // 如果错误答案不够，用完全随机的音高填充
        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer) {
                wrongAnswers.add(randomPitch);
            }
        }

        return Array.from(wrongAnswers);
    }

    /** 辅助函数：随机打乱数组 */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
