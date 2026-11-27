import { FourPartHarmonyGenerator } from './FourPartHarmonyGenerator.js';
import { harmonyXml, harmonyPlayback } from './harmony-score.js';
import { renderScore, disposeScore, listeningText as text } from './listening-score.js';
import { renderPianoAudio, setPianoAudio, clearPianoAudio } from './listening-audio.js';

const byId = id => document.getElementById(id);
const cards = [...document.querySelectorAll('.option-card')];
const slots = [...document.querySelectorAll('.dictation-chord')];
const playButton = byId('btn-play-harmony');
const playLabel = playButton.textContent;
const nextButton = byId('btn-next');
const status = byId('harmony-status');
const source = byId('review-source');
const voice = byId('review-voice');
let generator;
let question;
let correct = 0;
let wrong = 0;

function updateControls(q) {
    const reviewing = q.answered;
    playButton.disabled = q.loading || (!reviewing && (Boolean(q.audio) || q.plays >= 3));
    playButton.textContent = reviewing && q.audio ? text('stop', 'Stop') : playLabel;
    nextButton.hidden = !reviewing;
    byId('play-count-text').textContent = `${q.plays} / 3`;
    byId('timer-text').textContent = q.seconds === 60 ? '01:00' : `00:${String(q.seconds).padStart(2, '0')}`;
    byId('correct-count').textContent = correct;
    byId('wrong-count').textContent = wrong;
    const locked = reviewing || !q.plays;
    cards.forEach(card => card.querySelector('button').disabled = locked);
    slots.forEach(slot => slot.disabled = locked);
    byId('submit-dictation').disabled = locked || slots.some(slot => !slot.value);
}

function resumeTimer(q) {
    clearInterval(q.timer);
    if (q !== question || q.answered || !q.plays) return;
    q.timer = setInterval(() => {
        q.seconds--;
        if (!q.seconds) answer(q, null, true);
        else updateControls(q);
    }, 1000);
}

function stopAudio(q) {
    const audio = q.audio;
    q.audio = null;
    if (audio) clearPianoAudio(audio);
}

function clearQuestion() {
    if (!question) return;
    clearInterval(question.timer);
    stopAudio(question);
    for (const host of question.scores.values()) disposeScore(host);
    question = null;
}

async function draw(q, container, harmony, showAnalysis) {
    if (q.scores.has(container)) disposeScore(q.scores.get(container));
    const host = document.createElement('div');
    q.scores.set(container, host);
    container.replaceChildren(host);
    await renderScore(host, harmonyXml(harmony, showAnalysis), 0.78);
    if (question !== q || q.scores.get(container) !== host) disposeScore(host);
}

async function play(q) {
    if (!q || q.loading || (!q.answered && (q.audio || q.plays >= 3))) return;
    stopAudio(q);
    clearInterval(q.timer);
    const audio = new Audio();
    q.audio = audio;
    const index = q.answered && source.value === 'choice' ? q.choiceIndex : q.correctIndex;
    const part = q.answered ? voice.value : 'all';
    const cue = !q.answered && q.cue;
    const key = [index, part, cue].join('/');
    const current = () => question === q && q.audio === audio;
    const finish = () => {
        if (!current()) return;
        stopAudio(q);
        updateControls(q);
        resumeTimer(q);
    };
    audio.addEventListener('ended', finish, { once: true });
    updateControls(q);
    try {
        if (!q.recordings.has(key)) {
            status.textContent = text('loading', 'Loading...');
            const pending = renderPianoAudio(harmonyPlayback(q.options[index], part, cue));
            q.recordings.set(key, pending);
            pending.catch(() => q.recordings.delete(key));
        }
        const blob = await q.recordings.get(key);
        if (!current()) return;
        setPianoAudio(audio, blob);
        await audio.play();
        if (!current()) return;
        if (q.answered) {
            status.textContent = q.feedback;
        } else {
            q.plays++;
            status.textContent = q.dictation
                ? text('dictation-prompt', 'Choose the chord and inversion at each beat.')
                : text('prompt', 'Listen for the soprano and bass, then choose the matching score.');
        }
        updateControls(q);
    } catch {
        if (!current()) return;
        finish();
        status.textContent = text('audio-error', 'Audio could not play. Press Play Harmony to retry.');
    }
}

function markDictation(q) {
    const chords = q.options[0].chords;
    let matches = 0;
    slots.forEach((slot, i) => {
        const match = slot.value === chords[i].roman;
        if (match) matches++;
        slot.classList.add(match ? 'is-valid' : 'is-invalid');
        byId(`mark-${i}`).textContent = match ? '✓' : text('answer', 'Correct answer: {0}', chords[i].roman);
    });
    byId('submit-dictation').hidden = true;
    byId('dictation-score').hidden = false;
    return { success: matches === chords.length, detail: text('dictation-result', '{0} of 9 chords correct.', matches) };
}

function markChoice(q, index) {
    const right = cards[q.correctIndex];
    right.classList.add('border', 'border-success');
    right.querySelector('.option-result').textContent = text('correct', 'Correct!');
    if (index !== null && index !== q.correctIndex) {
        cards[index].classList.add('border', 'border-danger');
        cards[index].querySelector('.option-result').textContent = text('wrong', 'Wrong!');
        byId('review-comparison').hidden = false;
        const reference = q.options[q.correctIndex].chords;
        const differences = q.options[index].chords.flatMap((chord, i) =>
            chord.soprano.name === reference[i].soprano.name && chord.bass.name === reference[i].bass.name ? [] :
                [text('location', 'Measure {0}, beat {1}', Math.floor(i / 4) + 1, i % 4 + 1)]);
        const note = byId('review-difference');
        note.textContent = text('compare-beats', 'Listen for the difference at: {0}', differences.join(' · '));
        note.hidden = false;
    }
    return { success: index === q.correctIndex, detail: text('answer', 'Correct answer: {0}', right.querySelector('button').textContent.trim()) };
}

async function answer(q, index, timedOut = false) {
    if (!q || q.answered || !q.plays) return;
    clearInterval(q.timer);
    stopAudio(q);
    q.answered = true;
    q.choiceIndex = index;
    const { success, detail } = q.dictation ? markDictation(q) : markChoice(q, index);
    if (success && !timedOut) correct++;
    else wrong++;
    const result = timedOut ? text('timeout', "Time's up!") :
        success ? text('correct', 'Correct!') : text('wrong', 'Wrong!');
    q.feedback = result + ' ' + detail;
    status.textContent = q.feedback;
    byId('review-controls').hidden = false;
    updateControls(q);
    try {
        if (q.dictation) {
            await draw(q, byId('dictation-score'), q.options[0], true);
        } else {
            const indices = new Set([q.correctIndex]);
            if (index !== null) indices.add(index);
            await Promise.all([...indices].map(i => draw(q, cards[i].querySelector('.harmony-score'), q.options[i], true)));
        }
    } catch {
        if (q === question) status.textContent = q.feedback + ' ' + text('error', 'Could not load the exercise. Please try again.');
    }
}

async function nextQuestion() {
    clearQuestion();
    const dictation = byId('harmony-mode').value === 'dictation';
    const q = { dictation, cue: byId('tonic-cue').checked, scores: new Map(), recordings: new Map(),
        correctIndex: dictation ? 0 : Math.floor(Math.random() * cards.length),
        seconds: 60, plays: 0, answered: false, loading: true };
    question = q;
    byId('review-controls').hidden = true;
    byId('review-comparison').hidden = true;
    byId('review-difference').hidden = true;
    source.value = 'answer';
    voice.value = 'all';
    byId('dictation-panel').hidden = !dictation;
    byId('dictation-score').hidden = true;
    byId('submit-dictation').hidden = false;
    byId('score-options').hidden = dictation;
    slots.forEach((slot, i) => {
        slot.value = '';
        slot.classList.remove('is-valid', 'is-invalid');
        byId(`mark-${i}`).textContent = '';
    });
    cards.forEach(card => {
        card.classList.remove('border', 'border-success', 'border-danger');
        card.querySelector('.option-result').textContent = '';
        card.querySelector('.harmony-score').replaceChildren();
    });
    status.textContent = text('loading', 'Loading...');
    updateControls(q);
    try {
        q.options = dictation ? [generator.generateDictation()] : generator.generateOptions();
        if (!dictation) await Promise.all(q.options.map((option, i) =>
            draw(q, cards[i].querySelector('.harmony-score'), option, false)));
        if (q !== question) return;
        q.loading = false;
        await play(q);
    } catch {
        if (q !== question) return;
        status.textContent = text('error', 'Could not load the exercise. Please try again.');
        nextButton.hidden = false;
    }
}

byId('btn-start').addEventListener('click', () => {
    const option = byId('harmony-key').selectedOptions[0];
    const minor = option.value.endsWith('m');
    generator = new FourPartHarmonyGenerator(minor ? option.value.slice(0, -1) : option.value, minor);
    byId('current-key').textContent = `${option.textContent} · ${option.parentElement.label}`;
    for (const slot of slots) {
        slot.replaceChildren(new Option('—', ''), ...generator.numerals.map(roman => new Option(roman, roman)));
    }
    correct = wrong = 0;
    byId('start-overlay').hidden = true;
    byId('game-board').hidden = false;
    nextQuestion();
});
cards.forEach((card, i) => card.querySelector('button').addEventListener('click', () => answer(question, i)));
byId('dictation-panel').addEventListener('change', () => updateControls(question));
byId('submit-dictation').addEventListener('click', () => answer(question, null));
byId('review-controls').addEventListener('change', () => { if (question?.audio) play(question); });
playButton.addEventListener('click', () => {
    if (question?.answered && question.audio) {
        stopAudio(question);
        status.textContent = question.feedback;
        updateControls(question);
    } else {
        play(question);
    }
});
nextButton.addEventListener('click', nextQuestion);
byId('btn-settings').addEventListener('click', () => {
    clearQuestion();
    byId('game-board').hidden = true;
    byId('start-overlay').hidden = false;
    byId('harmony-key').focus();
});
