import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { getLocalizedText } from './localization.js';

export function listeningText(key, fallback, ...values) {
    return getLocalizedText(key, fallback).replace(/\{(\d+)\}/g, (match, index) => values[Number(index)] ?? match);
}

const activeScores = new WeakMap();
export function disposeScore(container) {
    const previous = activeScores.get(container);
    if (previous) { previous.setOptions({ autoResize: false }); previous.clear(); activeScores.delete(container); }
}

export async function fetchText(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error((await response.text()).slice(0, 400) || listeningText('request-failed', 'Request failed ({0})', response.status));
    return response.text();
}

export async function renderScore(container, xml, zoom = 0.85, uniformMeasures = false) {
    disposeScore(container);
    container.replaceChildren();
    const score = new OpenSheetMusicDisplay(container, {
        backend: 'svg', autoResize: true, autoBeam: true,
        drawTitle: false, drawSubtitle: false, drawComposer: false,
        drawCredits: false, drawPartNames: false, drawPartAbbreviations: false,
        drawingParameters: 'compacttight', pageFormat: 'Endless',
    });
    if (uniformMeasures) {
        // A changed accidental/rhythm can change automatic wrapping and reveal an edited option.
        // Focused choices contain one measure, using the same engraving rules.
        score.EngravingRules.RenderXMeasuresPerLineAkaSystem = 1;
        score.EngravingRules.StretchLastSystemLine = false;
    }
    score.Zoom = zoom;
    activeScores.set(container, score);
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error(listeningText('parse-failed', 'The score could not be parsed.'));
    if (uniformMeasures) {
        // Recompute courtesy accidentals and beaming for every version alike;
        // imported engraving hints must not distinguish the source from an edit.
        document.querySelectorAll('note > accidental, note > beam').forEach(element => element.remove());
    }
    await score.load(document);
    score.render();
    return score;
}

export function exclusiveAudio() {
    document.addEventListener('play', event => {
        if (event.target instanceof HTMLAudioElement) {
            document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
        }
    }, true);
}

const focusBindings = new WeakMap();
export function connectFocusReplay(audio, data, button, status) {
    focusBindings.get(audio)?.abort();
    const controller = new AbortController();
    focusBindings.set(audio, controller);
    const options = { signal: controller.signal };
    let targetOnly = false;
    let stopTimer;
    const cancelStop = () => { clearTimeout(stopTimer); };
    controller.signal.addEventListener('abort', cancelStop, { once: true });
    const scheduleStop = () => {
        cancelStop();
        if (targetOnly && !audio.paused) stopTimer = setTimeout(() => {
            targetOnly = false;
            audio.pause();
            audio.currentTime = data.focusEnd;
        }, Math.max(0, (data.focusEnd - audio.currentTime) / audio.playbackRate * 1000));
    };
    button.disabled = false;
    const update = () => {
        const inside = audio.currentTime >= data.focusStart && audio.currentTime < data.focusEnd;
        status.classList.toggle('listening-focus-playing', inside && !audio.paused);
        status.textContent = inside && !audio.paused
            ? listeningText('focus-playing', 'Target measure is playing — listen here.')
            : listeningText('focus-range', 'Target measure: {0}–{1} seconds. You can replay just this measure.',
                data.focusStart.toFixed(1), data.focusEnd.toFixed(1));
        if (targetOnly && audio.currentTime >= data.focusEnd) { targetOnly = false; audio.pause(); }
    };
    button.addEventListener('click', () => {
        audio.currentTime = data.focusStart;
        targetOnly = true;
        audio.play().catch(error => { status.textContent = error.message; });
    }, options);
    audio.addEventListener('timeupdate', update, options);
    audio.addEventListener('pause', () => { targetOnly = false; cancelStop(); update(); }, options);
    audio.addEventListener('play', () => { scheduleStop(); update(); }, options);
    audio.addEventListener('seeked', scheduleStop, options);
    audio.addEventListener('ratechange', scheduleStop, options);
    update();
}
