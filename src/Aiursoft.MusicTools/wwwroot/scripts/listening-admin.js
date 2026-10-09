import { fetchText, renderScore, exclusiveAudio, listeningText, connectFocusReplay } from './listening-score.js';
import { renderPianoAudio, fetchPianoPlayback, setPianoAudio, clearPianoAudio } from './listening-audio.js';

exclusiveAudio();
const errorBox = document.querySelector('.listening-error');
function report(error) { if (errorBox) errorBox.textContent = error.message; }
for (const audio of document.querySelectorAll('audio[data-playback-url]')) {
    try {
        const playback = await fetchPianoPlayback(audio.dataset.playbackUrl);
        setPianoAudio(audio, playback.blob);
        if (Number.isFinite(playback.data.focusStart)) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'btn btn-outline-primary btn-sm mt-2';
            button.textContent = listeningText('replay-target', 'Replay target measure');
            const status = document.createElement('p');
            status.className = 'listening-focus-panel p-2 mt-2 small';
            audio.after(button, status);
            connectFocusReplay(audio, playback.data, button, status);
        }
    }
    catch (error) { report(error); }
}
const renderers = [];
for (const container of document.querySelectorAll('[data-score-url]')) {
    try {
        renderers.push(await renderScore(container, await fetchText(container.dataset.scoreUrl), 0.85,
            Boolean(container.closest('.listening-option'))));
    } catch (error) { report(error); }
}
document.querySelector('.score-zoom')?.addEventListener('input', event => {
    for (const renderer of renderers) { renderer.Zoom = Number(event.target.value); renderer.render(); }
});

const editor = document.getElementById('listening-create');
if (editor) {
    const parts = JSON.parse(document.getElementById('score-parts').textContent);
    const form = document.getElementById('create-question-form');
    const start = document.getElementById('range-start');
    const end = document.getElementById('range-end');
    const focus = document.getElementById('focus-position');
    const part = form.elements.PartId;
    const staff = form.elements.Staff;
    const selector = document.getElementById('measure-selector');
    const status = document.getElementById('excerpt-status');
    const previewButton = document.getElementById('preview-excerpt');
    const audioButton = document.getElementById('audition-excerpt');
    const audio = document.getElementById('excerpt-audio');
    let awaitingEnd = false;
    let selectionVersion = 0;
    let excerptRenderer;
    let focusRenderer;
    const fullScore = document.getElementById('full-score');
    function choosePosition(position) {
        if (!awaitingEnd) { start.value = end.value = position; awaitingEnd = true; }
        else {
            const first = Number(start.value);
            start.value = Math.min(first, position);
            end.value = Math.max(first, position);
            awaitingEnd = false;
        }
        syncRange();
        if (!awaitingEnd) preview();
    }
    function highlightMeasures() {
        fullScore.querySelectorAll('.listening-measure-hit').forEach(rect => {
            const position = Number(rect.parentElement.dataset.listeningPosition);
            rect.setAttribute('fill', position >= Number(start.value) && position <= Number(end.value) ? '#3658a025' : 'transparent');
        });
    }
    function bindScoreMeasures() {
        const renderer = renderers[0];
        if (!renderer) return;
        const positions = renderer.GraphicSheet.MeasureList.flatMap((measures, index) => measures.filter(Boolean)
            .map(measure => ({ index, stave: measure.getVFStave() })));
        for (const group of fullScore.querySelectorAll('.vf-measure:not([data-listening-position])')) {
            // Match the drawn staff line to OSMD's positional measure, not its printed number.
            // This also handles pickups and duplicated printed measure numbers.
            const path = group.querySelector('path')?.getAttribute('d');
            const point = path?.match(/^M\s*([\d.eE+-]+)[ ,]+([\d.eE+-]+)/);
            if (!point) continue;
            const match = positions.find(p => Math.abs(p.stave.getX() - Number(point[1])) < 0.05 && Math.abs(p.stave.y - Number(point[2])) < 0.05);
            if (!match) continue;
            const position = match.index + 1;
            group.dataset.listeningPosition = position;
            group.setAttribute('role', 'button');
            group.setAttribute('tabindex', '0');
            group.setAttribute('aria-label', listeningText('measure', 'Select measure position {0}', position));
            group.style.cursor = 'pointer';
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.classList.add('listening-measure-hit');
            rect.setAttribute('x', String(match.stave.getX())); rect.setAttribute('y', String(match.stave.y - 10));
            rect.setAttribute('width', String(match.stave.getWidth())); rect.setAttribute('height', '60');
            rect.setAttribute('pointer-events', 'all');
            group.prepend(rect);
            group.addEventListener('click', () => choosePosition(position));
            group.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choosePosition(position); }
            });
        }
        highlightMeasures();
    }
    function syncRange() {
        form.elements.StartMeasureIndex.value = Number(start.value) - 1;
        form.elements.MeasureCount.value = Number(end.value) - Number(start.value) + 1;
        focus.min = start.value;
        focus.max = end.value;
        focus.value = Math.max(Number(start.value), Math.min(Number(focus.value), Number(end.value)));
        form.elements.FocusMeasureIndex.value = Number(focus.value) - 1;
        for (const button of selector.children) {
            const index = Number(button.dataset.position);
            const selected = index >= Number(start.value) && index <= Number(end.value);
            button.classList.toggle('btn-primary', selected);
            button.classList.toggle('btn-outline-secondary', !selected);
            button.setAttribute('aria-pressed', String(selected));
        }
        selectionVersion++;
        highlightMeasures();
        clearPianoAudio(audio);
        audio.hidden = true;
    }
    function showMeasures() {
        const selected = parts.find(p => p.Id === part.value);
        if (!selected) return;
        start.max = end.max = selected.MeasureLabels.length;
        start.value = Math.min(Number(start.value), selected.MeasureLabels.length);
        end.value = Math.min(Number(end.value), selected.MeasureLabels.length);
        [...staff.options].forEach(option => { option.disabled = option.value !== '' && Number(option.value) > selected.Staves; });
        if (Number(staff.value) > selected.Staves) staff.value = '';
        selector.replaceChildren();
        selected.MeasureLabels.forEach((label, i) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-sm listening-measure';
            button.dataset.position = i + 1;
            button.append(document.createTextNode(String(i + 1)));
            const small = document.createElement('small');
            small.textContent = label;
            button.append(small);
            button.addEventListener('click', () => choosePosition(i + 1));
            selector.append(button);
        });
        syncRange();
    }
    function parameters() {
        return new URLSearchParams({ scoreId: editor.dataset.scoreId, partId: part.value,
            start: form.elements.StartMeasureIndex.value, count: form.elements.MeasureCount.value,
            ...(staff.value ? { staff: staff.value } : {}) });
    }
    async function preview() {
        if (previewButton.disabled) return;
        previewButton.disabled = true;
        const version = selectionVersion;
        try {
            const xml = await fetchText(`/QuestionManagement/Excerpt?${parameters()}`);
            if (version !== selectionVersion) return;
            excerptRenderer?.clear();
            excerptRenderer = await renderScore(document.getElementById('excerpt-score'), xml);
            const focusParameters = parameters();
            focusParameters.set('start', form.elements.FocusMeasureIndex.value);
            focusParameters.set('count', '1');
            const target = await fetchText('/QuestionManagement/Excerpt?' + focusParameters);
            if (version !== selectionVersion) return;
            focusRenderer?.clear();
            focusRenderer = await renderScore(document.getElementById('focus-score'), target);
            errorBox.textContent = '';
        } catch (error) { report(error); }
        finally { previewButton.disabled = false; }
    }
    audioButton.addEventListener('click', async () => {
        const version = selectionVersion;
        audioButton.disabled = true;
        status.textContent = listeningText('preparing', 'Preparing audio…');
        try {
            const body = parameters();
            body.set('__RequestVerificationToken', form.elements.__RequestVerificationToken.value);
            const response = await fetch('/QuestionManagement/Audition', { method: 'POST', body });
            if (!response.ok) throw new Error((await response.text()).slice(0, 400));
            const blob = await renderPianoAudio(await response.json());
            if (version !== selectionVersion) { status.textContent = listeningText('selection-changed', 'Selection changed. Prepare audio again.'); return; }
            setPianoAudio(audio, blob);
            audio.hidden = false;
            status.textContent = listeningText('audio-ready', 'Ready. Press play to listen.');
        } catch (error) { status.textContent = error.message; }
        finally { audioButton.disabled = false; }
    });
    previewButton.addEventListener('click', preview);
    start.addEventListener('input', syncRange);
    end.addEventListener('input', syncRange);
    focus.addEventListener('input', () => { syncRange(); preview(); });
    form.elements.Skill.addEventListener('change', () => {
        const rhythm = form.elements.Skill.value === '1';
        form.elements.OptionCount.querySelector('[value="4"]').disabled = rhythm;
        if (rhythm) form.elements.OptionCount.value = '3';
    });
    part.addEventListener('change', showMeasures);
    staff.addEventListener('change', syncRange);
    form.addEventListener('submit', syncRange);
    showMeasures();
    bindScoreMeasures();
    new MutationObserver(bindScoreMeasures).observe(fullScore, { childList: true, subtree: true });
    await preview();
}
