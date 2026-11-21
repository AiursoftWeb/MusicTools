let audioContext;
let pianoLibrary;

export function getPianoAudioContext() {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
}

export function loadPianoLibrary() {
    if (!pianoLibrary) {
        const context = getPianoAudioContext();
        const resume = context.state === "suspended" ? context.resume() : Promise.resolve();

        // Evaluating Tone creates Web Audio nodes. Wait for the user's first sound
        // request, then use the same context for samples and oscillator playback.
        pianoLibrary = Promise.all([import("tone"), import("@tonejs/piano"), resume])
            .then(([Tone, { Piano }]) => {
                Tone.setContext(context, true);
                return { Tone, Piano };
            });
    }

    return pianoLibrary;
}
