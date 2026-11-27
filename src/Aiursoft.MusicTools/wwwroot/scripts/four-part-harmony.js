import { FourPartHarmonyGenerator } from './FourPartHarmonyGenerator.js';
import { harmonyXml, harmonyPlayback } from './harmony-score.js';
import { renderScore, disposeScore } from './listening-score.js';
import { renderPianoAudio, setPianoAudio, clearPianoAudio } from './listening-audio.js';
import { getLocalizedText } from './localization.js';

const byId = id => document.getElementById(id);
const cards = [...document.querySelectorAll('.option-card')];
const playButton = byId('btn-play-harmony');
const nextButton = byId('btn-next');
const status = byId('harmony-status');
let generator;
let question;
let correct = 0;
let wrong = 0;

function updateControls(q) {
    playButton.disabled = q.loading || q.playing || (!q.answered && q.plays >= 3);
    nextButton.hidden = !q.answered;
    byId('play-count-text').textContent = `${q.plays} / 3`;
    byId('timer-text').textContent = q.seconds === 60 ? '01:00' : `00:${String(q.seconds).padStart(2, '0')}`;
    byId('correct-count').textContent = correct;
    byId('wrong-count').textContent = wrong;
    cards.forEach(card => card.querySelector('button').disabled = q.answered || !q.plays);
}

function resumeTimer(q) {
    clearInterval(q.timer);
    if (q !== question || q.answered || !q.plays) return;
    q.timer = setInterval(() => {
        q.seconds--;
        if (!q.seconds) answer(q, null);
        else updateControls(q);
    }, 1000);
}

function clearQuestion() {
    if (!question) return;
    clearInterval(question.timer);
    clearPianoAudio(question.audio);
    for (const host of question.scores) disposeScore(host);
    question = null;
}

async function draw(q, index, showAnalysis) {
    const container = cards[index].querySelector('.harmony-score');
    if (q.scores[index]) disposeScore(q.scores[index]);
    const host = document.createElement('div');
    q.scores[index] = host;
    container.replaceChildren(host);
    await renderScore(host, harmonyXml(q.options[index], showAnalysis), 0.78);
    if (question !== q) disposeScore(host);
}

async function play(q) {
    if (q !== question || q.loading || q.playing || (!q.answered && q.plays >= 3)) return;
    q.playing = true;
    clearInterval(q.timer);
    updateControls(q);
    try {
        if (!q.audio.src) {
            status.textContent = getLocalizedText('loading', 'Loading...');
            const blob = await renderPianoAudio(harmonyPlayback(q.options[q.correctIndex]));
            if (q !== question) return;
            setPianoAudio(q.audio, blob);
        }
        q.audio.currentTime = 0;
        await q.audio.play();
        if (q !== question) return;
        if (!q.answered) {
            q.plays++;
            status.textContent = getLocalizedText('prompt', 'Listen for the soprano and bass, then choose the matching score.');
        } else {
            status.textContent = q.feedback;
        }
    } catch {
        if (q !== question) return;
        q.playing = false;
        status.textContent = getLocalizedText('audio-error', 'Audio could not play. Press Play Harmony to retry.');
        resumeTimer(q);
    }
    if (q === question) updateControls(q);
}

async function answer(q, index) {
    if (!q || q.answered || !q.plays) return;
    clearInterval(q.timer);
    q.answered = true;
    q.audio.pause();
    q.playing = false;
    if (index === q.correctIndex) correct++;
    else wrong++;
    const result = index === null ? getLocalizedText('timeout', "Time's up!") :
        index === q.correctIndex ? getLocalizedText('correct', 'Correct!') : getLocalizedText('wrong', 'Wrong!');
    const rightCard = cards[q.correctIndex];
    const rightLabel = rightCard.querySelector('button').textContent.trim();
    q.feedback = result + ' ' + getLocalizedText('answer', 'Correct answer: {0}').replace('{0}', rightLabel);
    status.textContent = q.feedback;
    rightCard.classList.add('border', 'border-success');
    rightCard.querySelector('.option-result').textContent = getLocalizedText('correct', 'Correct!');
    if (index !== null && index !== q.correctIndex) {
        cards[index].classList.add('border', 'border-danger');
        cards[index].querySelector('.option-result').textContent = result;
    }
    updateControls(q);
    try {
        await draw(q, q.correctIndex, true);
    } catch {
        if (q === question) status.textContent = q.feedback + ' ' + getLocalizedText('error', 'Could not load the exercise. Please try again.');
    }
}

async function nextQuestion() {
    clearQuestion();
    const q = { audio: new Audio(), scores: [], correctIndex: Math.floor(Math.random() * cards.length),
        seconds: 60, plays: 0, answered: false, playing: false, loading: true };
    question = q;
    cards.forEach(card => {
        card.classList.remove('border', 'border-success', 'border-danger');
        card.querySelector('.option-result').textContent = '';
        card.querySelector('.harmony-score').replaceChildren();
    });
    q.audio.addEventListener('ended', () => {
        if (q !== question) return;
        q.playing = false;
        updateControls(q);
        resumeTimer(q);
    });
    status.textContent = getLocalizedText('loading', 'Loading...');
    updateControls(q);
    try {
        q.options = generator.generateOptions();
        await Promise.all(q.options.map((_, index) => draw(q, index, false)));
        if (q !== question) return;
        q.loading = false;
        await play(q);
    } catch {
        if (q !== question) return;
        status.textContent = getLocalizedText('error', 'Could not load the exercise. Please try again.');
        nextButton.hidden = false;
    }
}

byId('btn-start').addEventListener('click', () => {
    const select = byId('harmony-key');
    const option = select.selectedOptions[0];
    const minor = option.value.endsWith('m');
    generator = new FourPartHarmonyGenerator(minor ? option.value.slice(0, -1) : option.value, minor);
    byId('current-key').textContent = `${option.textContent} · ${option.parentElement.label}`;
    correct = wrong = 0;
    byId('start-overlay').hidden = true;
    byId('game-board').hidden = false;
    nextQuestion();
});
cards.forEach((card, index) => card.querySelector('button').addEventListener('click', () => answer(question, index)));
playButton.addEventListener('click', () => play(question));
nextButton.addEventListener('click', nextQuestion);
byId('btn-settings').addEventListener('click', () => {
    clearQuestion();
    byId('game-board').hidden = true;
    byId('start-overlay').hidden = false;
    byId('harmony-key').focus();
});
