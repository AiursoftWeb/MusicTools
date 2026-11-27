// Both notation and playback use the same spelled pitches and beat lengths.
const voices = ['soprano', 'alto', 'tenor', 'bass'];

export function harmonyPlayback(harmony) {
    const notes = [];
    let time = 0;
    for (const chord of harmony.chords) {
        for (const voice of voices) notes.push({ midi: chord[voice].midi, time, duration: chord.beats });
        time += chord.beats; // One beat per second.
    }
    return { notes, duration: time };
}

export function harmonyXml(harmony, showAnalysis = false) {
    const visible = showAnalysis ? voices : ['soprano', 'bass'];
    const attributes = `<attributes><divisions>1</divisions>
        <key><fifths>${harmony.fifths}</fifths><mode>${harmony.isMinor ? 'minor' : 'major'}</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
    const measures = [0, 4, 8].map((start, index) => {
        const lines = visible.map(voice => {
            const number = voices.indexOf(voice) + 1;
            return harmony.chords.slice(start, start + 4).map(chord => {
                const note = chord[voice];
                const pitch = `<step>${note.letter}</step><alter>${note.alt}</alter><octave>${note.oct}</octave>`;
                const stem = showAnalysis && chord.beats === 1 ? `<stem>${number % 2 ? 'up' : 'down'}</stem>` : '';
                const analysis = showAnalysis && voice === 'bass' ? `<lyric><text>${chord.roman}</text></lyric>` : '';
                return `<note><pitch>${pitch}</pitch><duration>${chord.beats}</duration><voice>${number}</voice>
                    <type>${chord.beats === 4 ? 'whole' : 'quarter'}</type>${stem}
                    <staff>${number <= 2 ? 1 : 2}</staff>${analysis}</note>`;
            }).join('');
        });
        const barline = index === 2 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '';
        return `<measure number="${index + 1}">${index === 0 ? attributes : ''}
            ${lines.join('<backup><duration>4</duration></backup>')}${barline}</measure>`;
    });
    return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name>
        </score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}
