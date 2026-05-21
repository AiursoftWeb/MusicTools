import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import OsmdAudioPlayer from 'osmd-audio-player';
import JSZip from 'jszip';
import { getLocalizedText } from './localization.js';

class MelodyExcerptQuiz {
    constructor(domElements, localizedStrings) {
        this.dom = domElements;
        this.loc = localizedStrings;

        this.osmds = [];
        this.audioPlayer = new OsmdAudioPlayer();

        this.originalXmlDoc = null;
        this.currentExcerptXml = "";
        this.options = [];
        this.correctIndex = -1;
        this.isAnswered = false;
        this.correctCount = 0;
        this.wrongCount = 0;

        this.isBankMode = false;
        this.selectedBankQuestion = null;

        this._init();
    }

    async _init() {
        this.dom.btnStart.addEventListener('click', () => this.startGame());
        this.dom.btnPlayMelody.addEventListener('click', () => this._playFromStart());
        this.dom.btnNext.addEventListener('click', () => this.nextQuestion());
        this.dom.btnBack.addEventListener('click', () => location.reload());

        if (this.dom.fileInput) {
            this.dom.fileInput.addEventListener('change', (e) => this._handleFileUpload(e));
        }

        this.dom.optionCards.forEach((card, index) => {
            card.addEventListener('click', () => this._handleChoice(index));
        });

        if (this.dom.bankItems) {
            this.dom.bankItems.forEach(item => {
                item.addEventListener('click', () => {
                    this.dom.bankItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    this.selectedBankQuestion = {
                        scoreUrl: item.dataset.scoreUrl,
                        startMeasure: parseInt(item.dataset.startMeasure),
                        title: item.dataset.title
                    };
                    this.startGameFromBank();
                });
            });
        }

        for (let i = 0; i < 4; i++) {
            const osmd = new OpenSheetMusicDisplay(`staff-${i}`, {
                autoResize: true,
                backend: "svg",
                drawTitle: false,
                drawMeasureNumbers: false,
                drawPartNames: false,
                drawCredits: false
            });
            this.osmds.push(osmd);
        }
    }

    async _playFromStart() {
        try { await this.audioPlayer.stop(); } catch (e) { /* ignore */ }
        const hiddenOsmd = new OpenSheetMusicDisplay(document.createElement("div"));
        await hiddenOsmd.load(this.currentExcerptXml);
        hiddenOsmd.render();
        await this.audioPlayer.loadScore(hiddenOsmd);
        try {
            await this.audioPlayer.play();
        } catch (e) {
            console.log('Playback error', e);
        }
    }

    async _handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.originalXmlDoc = await this._parseFileToXml(file);
        } catch (error) {
            console.error("[MelodyExcerptQuiz] Error loading custom score:", error);
            alert(this.loc.customLoadFailed + error.message);
            event.target.value = "";
        }
    }

    async _parseFileToXml(file) {
        let xmlString = "";
        if (file.name.endsWith('.mxl')) {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            let xmlFileContent = null;
            for (let filename of Object.keys(zip.files)) {
                if (filename.endsWith('.xml') && !filename.startsWith('META-INF')) {
                    xmlFileContent = await zip.files[filename].async("string");
                    break;
                }
            }
            if (!xmlFileContent) throw new Error("Could not find .xml inside .mxl");
            xmlString = xmlFileContent;
        } else {
            xmlString = await file.text();
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        if (xmlDoc.getElementsByTagName("measure").length < 4) {
            throw new Error(this.loc.tooShort);
        }
        return xmlDoc;
    }

    async startGame() {
        if (!this.originalXmlDoc) {
            alert(this.loc.noScore);
            return;
        }

        this.isBankMode = false;
        this.dom.startOverlay.classList.add('d-none');
        this.dom.gameBoard.classList.remove('d-none');
        this.nextQuestion();
    }

    async startGameFromBank() {
        if (!this.selectedBankQuestion) return;

        try {
            const response = await fetch(this.selectedBankQuestion.scoreUrl);
            if (!response.ok) throw new Error("Failed to fetch score file from server.");
            const blob = await response.blob();
            const file = new File([blob], "score.mxl", { type: blob.type });

            this.originalXmlDoc = await this._parseFileToXml(file);
            this.isBankMode = true;

            this.dom.startOverlay.classList.add('d-none');
            this.dom.gameBoard.classList.remove('d-none');
            this.nextQuestion();
        } catch (error) {
            console.error("[MelodyExcerptQuiz] Error starting bank game:", error);
            alert(this.loc.customLoadFailed + error.message);
        }
    }

    async nextQuestion() {
        this.isAnswered = false;

        try { await this.audioPlayer.stop(); } catch (e) { /* ignore */ }

        this.dom.btnNext.classList.add('d-none');
        this.dom.optionCards.forEach(card => {
            card.classList.remove('correct', 'wrong');
            card.style.pointerEvents = 'auto';
        });

        const parts = this.originalXmlDoc.getElementsByTagName("part");
        const measures = parts[0].getElementsByTagName("measure");
        const totalMeasures = measures.length;

        let startMeasureIdx;
        if (this.isBankMode && this.selectedBankQuestion) {
            startMeasureIdx = this.selectedBankQuestion.startMeasure;
        } else {
            startMeasureIdx = Math.floor(Math.random() * (totalMeasures - 4));
        }

        const targetMeasures = [startMeasureIdx, startMeasureIdx + 1, startMeasureIdx + 2, startMeasureIdx + 3];
        const correctMeasureNodes = targetMeasures.map(idx => measures[idx]);
        const attributesNode = this._findAttributesUpTo(startMeasureIdx);
        const correctXml = this._createMusicXMLFromMeasures(attributesNode, correctMeasureNodes);

        this.options = [{ xml: correctXml, isCorrect: true }];
        while (this.options.length < 4) {
            const modifiedMeasures = correctMeasureNodes.map(node => this._generateMeasureVariation(node));
            const distractorXml = this._createMusicXMLFromMeasures(attributesNode, modifiedMeasures);
            this.options.push({ xml: distractorXml, isCorrect: false });
        }

        this._shuffleArray(this.options);
        this.correctIndex = this.options.findIndex(o => o.isCorrect);
        this.currentExcerptXml = this.options[this.correctIndex].xml;

        for (let i = 0; i < 4; i++) {
            await this.osmds[i].load(this.options[i].xml);
            this.osmds[i].render();
        }

        const hiddenOsmd = new OpenSheetMusicDisplay(document.createElement("div"));
        await hiddenOsmd.load(this.currentExcerptXml);
        hiddenOsmd.render();
        await this.audioPlayer.loadScore(hiddenOsmd);

        if (this.isBankMode) {
            this.dom.btnNext.textContent = getLocalizedText('back-to-bank', 'Back to Bank');
            this.dom.btnNext.onclick = () => location.reload();
        } else {
            this.dom.btnNext.textContent = getLocalizedText('next-question', 'Next Question');
            this.dom.btnNext.onclick = () => this.nextQuestion();
        }

        // Auto-play
        try {
            await this.audioPlayer.play();
        } catch (e) {
            console.log('Playback error', e);
        }
    }

    _handleChoice(index) {
        if (this.isAnswered) return;

        if (index === this.correctIndex) {
            this.isAnswered = true;
            this.correctCount++;
            this.dom.correctCountLabel.textContent = this.correctCount;
            this.dom.optionCards[index].classList.add('correct');
            this.dom.btnNext.classList.remove('d-none');
            this.dom.optionCards.forEach(card => card.style.pointerEvents = 'none');
        } else {
            this.wrongCount++;
            this.dom.wrongCountLabel.textContent = this.wrongCount;
            this.dom.optionCards[index].classList.add('wrong');
            this.dom.optionCards[index].style.pointerEvents = 'none';
        }
    }

    _findAttributesUpTo(measureIndex) {
        const parts = this.originalXmlDoc.getElementsByTagName("part");
        const measures = parts[0].getElementsByTagName("measure");
        let lastAttributes = null;

        for (let i = 0; i <= measureIndex; i++) {
            const attrs = measures[i].getElementsByTagName("attributes");
            if (attrs.length > 0) {
                lastAttributes = attrs[attrs.length - 1];
            }
        }
        return lastAttributes;
    }

    _createMusicXMLFromMeasures(attributesNode, measureNodes) {
        let measuresXml = "";
        measureNodes.forEach((node, i) => {
            let mXml = new XMLSerializer().serializeToString(node);
            if (i === 0 && attributesNode && !mXml.includes("<attributes>")) {
                const attrsXml = new XMLSerializer().serializeToString(attributesNode);
                mXml = mXml.replace(/<measure[^>]*>/, `$&${attrsXml}`);
            }
            measuresXml += mXml;
        });

        return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1"><part-name>Excerpt</part-name></score-part>
          </part-list>
          <part id="P1">
            ${measuresXml}
          </part>
        </score-partwise>`;
    }

    _generateMeasureVariation(measureNode) {
        const fakeNode = measureNode.cloneNode(true);
        const pitches = fakeNode.getElementsByTagName("pitch");
        if (pitches.length > 0) {
            const targetNoteIdx = Math.floor(Math.random() * pitches.length);
            const pitch = pitches[targetNoteIdx];
            const stepNode = pitch.getElementsByTagName("step")[0];
            if (stepNode) {
                const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                const currentStep = stepNode.textContent;
                let newStep;
                do {
                    newStep = steps[Math.floor(Math.random() * steps.length)];
                } while (newStep === currentStep);
                stepNode.textContent = newStep;
            }
        }
        return fakeNode;
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

window.startMelodyExcerptQuiz = () => {
    const dom = {
        startOverlay: document.getElementById('start-overlay'),
        gameBoard: document.getElementById('game-board'),
        btnStart: document.getElementById('btn-start'),
        bankItems: document.querySelectorAll('.question-bank-item'),
        btnPlayMelody: document.getElementById('btn-play-melody'),
        btnNext: document.getElementById('btn-next'),
        btnBack: document.getElementById('btn-back'),
        fileInput: document.getElementById('file-input'),
        optionCards: [
            document.getElementById('option-0'),
            document.getElementById('option-1'),
            document.getElementById('option-2'),
            document.getElementById('option-3')
        ],
        correctCountLabel: document.getElementById('correct-count'),
        wrongCountLabel: document.getElementById('wrong-count')
    };

    const loc = {
        correct: getLocalizedText('correct', 'Correct!'),
        wrong: getLocalizedText('wrong', 'Wrong! Try again.'),
        loading: getLocalizedText('loading', 'Loading score...'),
        customLoadFailed: getLocalizedText('custom-load-failed', 'Failed to load the custom score: '),
        tooShort: getLocalizedText('too-short', 'Score must have at least 4 measures.'),
        noScore: getLocalizedText('no-score', 'Please upload a music score before starting.'),
        backToBank: getLocalizedText('back-to-bank', 'Back to Bank'),
        nextQuestion: getLocalizedText('next-question', 'Next Question'),
        playMelody: getLocalizedText('play-melody', 'Play Melody')
    };

    return new MelodyExcerptQuiz(dom, loc);
};
