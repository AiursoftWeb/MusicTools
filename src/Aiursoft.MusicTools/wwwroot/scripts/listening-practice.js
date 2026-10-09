import { fetchText, renderScore, disposeScore, exclusiveAudio, listeningText, connectFocusReplay } from './listening-score.js';
import { fetchPianoPlayback, setPianoAudio, clearPianoAudio } from './listening-audio.js';

exclusiveAudio();
const form = document.getElementById('listening-practice');
if (form) {
    const stage = document.getElementById('practice-stage');
    const cards = document.getElementById('practice-cards');
    const submit = document.getElementById('submit-answer');
    const start = document.getElementById('start-practice');
    const result = document.getElementById('practice-result');
    const errorBox = document.getElementById('practice-error');
    const status = document.getElementById('practice-status');
    const audio = document.getElementById('practice-audio');
    const zoom = document.getElementById('practice-zoom');
    const targetButton = document.getElementById('replay-target');
    const focusStatus = document.getElementById('focus-playback-status');
    let attempt;
    let renderers = [];
    let submitted = false;
    let answered = 0;
    let correct = 0;
    function tokenBody(values) {
        return new URLSearchParams({ ...values, __RequestVerificationToken: form.elements.__RequestVerificationToken.value });
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        start.disabled = true;
        submit.disabled = true;
        errorBox.textContent = '';
        result.hidden = true;
        clearPianoAudio(audio);
        targetButton.disabled = true;
        submitted = false;
        attempt = null;
        cards.querySelectorAll('.listening-score').forEach(disposeScore);
        cards.replaceChildren();
        renderers = [];
        stage.hidden = false;
        status.textContent = listeningText('loading-focused', 'Loading the short versions…');
        try {
            const data = JSON.parse(await fetchText('/Listening/Start', { method: 'POST', body: tokenBody({ questionId: form.elements.questionId.value }) }));
            document.getElementById('practice-title').textContent = data.Title;
            document.getElementById('practice-prompt').textContent = data.Prompt;
            document.getElementById('practice-focus').textContent = listeningText('focus-location',
                'Only compare measure position {0}, pitched note {1}. For rhythm, compare that note and the next.',
                data.FocusPosition, data.FocusNotePosition);
            cards.dataset.count = data.Choices.length;
            for (let index = 0; index < data.Choices.length; index++) {
                const choice = data.Choices[index];
                const column = document.createElement('div');
                column.className = 'col-md-6 listening-answer-column';
                const article = document.createElement('article');
                article.className = 'card h-100 listening-option';
                article.dataset.choice = choice.Key;
                const label = document.createElement('label');
                label.className = 'listening-choice-label';
                const radio = document.createElement('input');
                radio.type = 'radio'; radio.name = 'choice'; radio.value = choice.Key;
                radio.className = 'form-check-input'; radio.disabled = true;
                radio.addEventListener('change', () => {
                    cards.querySelectorAll('.listening-option').forEach(card => card.classList.toggle('selected', card.dataset.choice === choice.Key));
                    submit.disabled = submitted;
                });
                const letter = document.createElement('span');
                letter.className = 'listening-choice-letter'; letter.textContent = String.fromCharCode(65 + index);
                label.append(radio, letter);
                const body = document.createElement('div');
                body.className = 'card-body pt-0';
                const notation = document.createElement('div');
                notation.className = 'listening-score';
                body.append(notation); article.append(label, body); column.append(article); cards.append(column);
                renderers.push(await renderScore(notation, await fetchText(choice.XmlUrl), Number(zoom.value), true));
            }
            attempt = data.AttemptId;
            const playback = await fetchPianoPlayback(data.AudioUrl);
            setPianoAudio(audio, playback.blob);
            connectFocusReplay(audio, playback.data, targetButton, focusStatus);
            cards.querySelectorAll('input').forEach(input => { input.disabled = false; });
            status.textContent = listeningText('ready-focused', 'Listen to the target measure, then choose the matching short version. Any approved version may be played.');
        } catch (error) { errorBox.textContent = error.message; status.textContent = listeningText('load-failed', 'Could not load this question. Please try again.'); }
        finally { start.disabled = false; }
    });
    submit.addEventListener('click', async () => {
        const selected = cards.querySelector('input:checked');
        if (!attempt || !selected || submitted) return;
        submit.disabled = true; start.disabled = true;
        cards.querySelectorAll('input').forEach(input => { input.disabled = true; });
        try {
            const answer = JSON.parse(await fetchText('/Listening/Submit', { method: 'POST', body: tokenBody({ id: attempt, choice: selected.value }) }));
            submitted = true;
            answered++; if (answer.Correct) correct++;
            cards.querySelectorAll('.listening-option').forEach(card => {
                card.classList.toggle('correct', card.dataset.choice === answer.CorrectChoice);
                card.classList.toggle('incorrect', !answer.Correct && card.dataset.choice === answer.SelectedChoice);
            });
            const correctIndex = [...cards.querySelectorAll('.listening-option')].findIndex(card => card.dataset.choice === answer.CorrectChoice);
            const heading = document.createElement('h3');
            heading.className = 'h5';
            heading.textContent = `${answer.Correct ? listeningText('correct', 'Correct!') : listeningText('incorrect', 'Keep listening.')} ${listeningText('answer', 'Answer: {0}', String.fromCharCode(65 + correctIndex))}`;
            const explanation = document.createElement('p'); explanation.className = 'mb-0'; explanation.textContent = answer.Explanation;
            result.replaceChildren(heading, explanation); result.hidden = false;
            document.getElementById('practice-score').textContent = listeningText('session', '{0} / {1} correct this session', correct, answered);
            status.textContent = listeningText('replay', 'Replay and compare the scores, or start a new attempt.');
        } catch (error) {
            errorBox.textContent = error.message;
            submit.disabled = false;
            cards.querySelectorAll('input').forEach(input => { input.disabled = false; });
        } finally { start.disabled = false; }
    });
    audio.addEventListener('error', () => { if (attempt) errorBox.textContent = listeningText('audio-failed', 'The recording could not be loaded. Start a new attempt or try again later.'); });
    zoom.addEventListener('input', () => { for (const renderer of renderers) { renderer.Zoom = Number(zoom.value); renderer.render(); } });
}
