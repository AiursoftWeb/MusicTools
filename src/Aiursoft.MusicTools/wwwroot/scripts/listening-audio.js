// Use the same locally shipped Salamander piano samples as the existing piano tools.
// Offline rendering gives native audio controls reliable seek/pause/replay without
// leaving scheduled notes playing when a question or selection changes.
const samples = new Map();
const audioUrls = new WeakMap();
const anchors = Array.from({ length: 30 }, (_, index) => 21 + index * 3);
const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

async function sample(midi) {
    const anchor = anchors.reduce((best, value) => Math.abs(value - midi) < Math.abs(best - midi) ? value : best, 21);
    if (!samples.has(anchor)) {
        const pending = (async () => {
            const name = names[anchor % 12] + (Math.floor(anchor / 12) - 1);
            const response = await fetch('/dist/audio/salamander/' + name + 'v8.mp3');
            if (!response.ok) throw new Error('The piano sample could not be loaded.');
            const decoder = new OfflineAudioContext(1, 1, 44100);
            return decoder.decodeAudioData(await response.arrayBuffer());
        })();
        samples.set(anchor, pending);
        pending.catch(() => samples.delete(anchor));
    }
    return { buffer: await samples.get(anchor), rate: 2 ** ((midi - anchor) / 12) };
}

export async function renderPianoAudio(data) {
    if (!Array.isArray(data.notes) || !data.notes.length || data.notes.length > 10000 ||
        !Number.isFinite(data.duration) || data.duration <= 0 || data.duration > 180) {
        throw new Error('Invalid passage playback data.');
    }
    const context = new OfflineAudioContext(2, Math.ceil((data.duration + .3) * 44100), 44100);
    for (const note of data.notes) {
        if (!Number.isInteger(note.midi) || note.midi < 21 || note.midi > 108 ||
            !Number.isFinite(note.time) || note.time < 0 || !Number.isFinite(note.duration) ||
            note.duration <= 0 || note.time + note.duration > data.duration + .001) {
            throw new Error('Invalid note playback data.');
        }
        const sound = await sample(note.midi);
        const source = context.createBufferSource();
        source.buffer = sound.buffer;
        source.playbackRate.value = sound.rate;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, note.time);
        gain.gain.linearRampToValueAtTime(.7, note.time + Math.min(.003, note.duration / 2));
        gain.gain.setValueAtTime(.7, note.time + note.duration);
        gain.gain.linearRampToValueAtTime(0, note.time + note.duration + .08);
        source.connect(gain).connect(context.destination);
        source.start(note.time);
        source.stop(note.time + note.duration + .08);
    }
    const rendered = await context.startRendering();
    const left = rendered.getChannelData(0), right = rendered.getChannelData(1);
    let peak = 1;
    for (let index = 0; index < left.length; index++) peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
    const wav = new ArrayBuffer(44 + left.length * 4);
    const view = new DataView(wav);
    const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    text(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 2, true); view.setUint32(24, 44100, true);
    view.setUint32(28, 176400, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, left.length * 4, true);
    for (let index = 0; index < left.length; index++) {
        view.setInt16(44 + index * 4, Math.round(left[index] / peak * 32767), true);
        view.setInt16(46 + index * 4, Math.round(right[index] / peak * 32767), true);
    }
    return new Blob([wav], { type: 'audio/wav' });
}

export function clearPianoAudio(audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    const previous = audioUrls.get(audio);
    if (previous) { URL.revokeObjectURL(previous); audioUrls.delete(audio); }
}

export function setPianoAudio(audio, blob) {
    clearPianoAudio(audio);
    const url = URL.createObjectURL(blob);
    audioUrls.set(audio, url);
    audio.src = url;
}

export async function fetchPianoAudio(url) {
    return (await fetchPianoPlayback(url)).blob;
}

export async function fetchPianoPlayback(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error((await response.text()).slice(0, 400));
    const data = await response.json();
    return { data, blob: await renderPianoAudio(data) };
}
