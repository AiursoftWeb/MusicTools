const PITCHS = {
    C_2: { line: true, linesAtTop: 1, position: 225 },
    D_2: { line: false, linesAtTop: 1, position: 217 },
    E_2: { line: true, position: 207 },
    F_2: { line: false, position: 197 },
    G_2: { line: false, position: 187 },
    A_2: { line: false, position: 177 },
    B_2: { line: false, position: 167 },

    C_1: { line: false, position: 157 },
    D_1: { line: false, position: 147 },
    E_1: { line: false, position: 137 },
    F_1: { line: false, position: 126 },
    G_1: { line: false, position: 117 },
    A_1: { line: false, position: 107 },
    B_1: { line: false, position: 97 },

    C: { line: true, position: 44 },
    D: { line: false, position: 37 },
    E: { line: false, position: 28 },
    F: { line: false, position: 17 },
    G: { line: false, position: 8 },
    A: { line: false, position: -3 },
    B: { line: false, position: -12 },
    C2: { line: false, position: -23 },
    D2: { line: false, position: -33 },
    E2: { line: false, position: -43 },
    F2: { line: false, position: -54 },
    G2: { line: false, position: -63 },
    A2: { line: true, position: -73 },
    B2: { line: false, linesAtBottom: 1, position: -83 },
};


class Staff {
    constructor(containerId) {
        this.#container = document.getElementById(containerId);

        this.#staffMain = document.createElement('div');
        this.#staffMain.className = 'key-signature-pair position-relative';
        this.#staffMain.innerHTML = `
    <div class="staff-wrapper">
        <div class="staff-line" style="top: 0em;"></div>
        <div class="staff-line" style="top: 1em;"></div>
        <div class="staff-line" style="top: 2em;"></div>
        <div class="staff-line" style="top: 3em;"></div>
        <div class="staff-line" style="top: 4em;"></div><span class="clef"
            style="top: 2.7em; left: 5px;"><span style="font-size: 4em;"></span></span>
    </div>
    <div class="staff-wrapper">
        <div class="staff-line" style="top: 0em;"></div>
        <div class="staff-line" style="top: 1em;"></div>
        <div class="staff-line" style="top: 2em;"></div>
        <div class="staff-line" style="top: 3em;"></div>
        <div class="staff-line" style="top: 4em;"></div><span class="clef"
            style="top: 0.7em; left: 5px;"><span style="font-size: 4em;"></span></span>
    </div>`;

        const note = new Note();
        note.attachTo(this.#staffMain);
        this.#note = note;

        this.#container.appendChild(this.#staffMain);
    }

    #container;
    #staffMain;
    #note;

    setPitch(pitch) {
        pitch = pitch.toUpperCase();
        if (!pitch) {
            pitch = 'C';
        }
        const { line, position, linesAtBottom, linesAtTop } = PITCHS[pitch];
        this.#note.setPitch(line, position, linesAtBottom || 0, linesAtTop || 0);

    }
}

class Note {
    constructor() {
        this.note = document.createElement('div');
        this.note.className = 'position-absolute end-24';
        this.note.style.top = '44px';

        this.note.innerHTML = `
<img src="/images/note.png" alt="note" width="64" height="64">
        `;

        this.noteLine = document.createElement('div');
        this.noteLine.setAttribute('hidden', '');
        this.noteLine.className = 'note-line'

        this.note.appendChild(this.noteLine);
    }

    #extraLines = [];

    attachTo(parent) {
        parent.appendChild(this.note);
    }

    setPitch(line, position, linesAtBottom, linesAtTop) {
        console.log(line, position, linesAtBottom, linesAtTop);
        this.note.style.top = `${position}px`;
        if (line) {
            this.noteLine.removeAttribute('hidden');
        } else {
            this.noteLine.setAttribute('hidden', '');
        }

        this.#extraLines.forEach(l => l.remove());
        this.#extraLines = [];
        if (linesAtTop > 0) {
            const l = this.noteLine.cloneNode(true);
            l.removeAttribute('hidden');
            this.note.appendChild(l);
            if (line === true) {
                l.style.bottom = '26px';
            } else {
                l.style.bottom = '18px';
            }

            this.#extraLines.push(l);
        }

        if (linesAtBottom > 0) {
            const l = this.noteLine.cloneNode(true);
            l.removeAttribute('hidden');
            this.note.appendChild(l);
            if (line === true) {
                l.style.bottom = '-26px';
            } else {
                l.style.bottom = '-2px';
            }

            this.#extraLines.push(l);
        }
    }
}

let staff;
window.addEventListener("load", () => {
    staff = new Staff('question-staff-container');
    staff.setPitch('C');
});
