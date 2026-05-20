import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import JSZip from 'jszip';

window.startCreateQuestionPreview = () => {
    const osmd = new OpenSheetMusicDisplay("osmd-container", {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawMeasureNumbers: true
    });

    const excerptOsmd = new OpenSheetMusicDisplay("osmd-excerpt-container", {
        autoResize: true,
        backend: "svg",
        drawTitle: false,
        drawMeasureNumbers: false
    });

    const scoreUrl = document.getElementById('score-url')?.textContent;
    const startMeasureInput = document.getElementById('start-measure-input');
    const selectedRangeText = document.getElementById('selected-range-text');

    if (!scoreUrl) return;

    const MEASURE_COUNT = 4;
    let totalMeasures = 0;
    let currentStart = 0;

    function getTotalMeasures() {
        const measureList = osmd.GraphicSheet.MeasureList;
        const nums = new Set();
        for (const staffMeasures of measureList) {
            if (!staffMeasures) continue;
            for (const m of staffMeasures) {
                if (m && m.MeasureNumber > 0) {
                    nums.add(m.MeasureNumber);
                }
            }
        }
        return nums.size;
    }

    function buildMeasureSelector() {
        const container = document.getElementById('measure-selector');
        container.innerHTML = '';

        for (let i = 0; i <= totalMeasures - MEASURE_COUNT; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-outline-primary measure-btn';
            btn.textContent = `${i + 1}–${i + MEASURE_COUNT}`;
            btn.dataset.start = i;
            btn.addEventListener('click', () => selectMeasures(i));
            container.appendChild(btn);
        }
    }

    function updateButtonStyles(startIndex) {
        document.querySelectorAll('.measure-btn').forEach(btn => {
            const s = parseInt(btn.dataset.start);
            const inRange = s >= startIndex && s < startIndex + MEASURE_COUNT;
            btn.classList.toggle('active', btn.dataset.start == startIndex);
            btn.classList.toggle('in-range', inRange && btn.dataset.start != startIndex);
        });
    }

    async function selectMeasures(startIndex) {
        currentStart = startIndex;
        startMeasureInput.value = startIndex;
        selectedRangeText.textContent = `Measures ${startIndex + 1}–${startIndex + MEASURE_COUNT}`;
        updateButtonStyles(startIndex);
        await loadExcerpt(startIndex);
    }

    async function loadExcerpt(startIndex) {
        try {
            const response = await fetch(scoreUrl);
            if (!response.ok) throw new Error("Failed to fetch score");
            const blob = await response.blob();

            let xmlString;
            if (blob.type.includes('zip') || scoreUrl.toLowerCase().endsWith('.mxl')) {
                const zip = await JSZip.loadAsync(await blob.arrayBuffer());
                let entry = null;
                for (const name of Object.keys(zip.files)) {
                    if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
                        entry = zip.files[name];
                        break;
                    }
                }
                if (!entry) return;
                xmlString = await entry.async("string");
            } else {
                xmlString = await blob.text();
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");
            const measures = xmlDoc.getElementsByTagName("measure");

            let attributesNode = null;
            for (let i = 0; i <= startIndex && i < measures.length; i++) {
                const attrs = measures[i].getElementsByTagName("attributes");
                if (attrs.length > 0) attributesNode = attrs[0];
            }

            let measuresXml = "";
            for (let i = 0; i < MEASURE_COUNT && (startIndex + i) < measures.length; i++) {
                let mXml = new XMLSerializer().serializeToString(measures[startIndex + i]);
                if (i === 0 && attributesNode && !mXml.includes("<attributes>")) {
                    const attrsXml = new XMLSerializer().serializeToString(attributesNode);
                    mXml = mXml.replace(/<measure[^>]*>/, `$&${attrsXml}`);
                }
                measuresXml += mXml;
            }

            const excerptXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
            <score-partwise version="3.1">
              <part-list>
                <score-part id="P1"><part-name>Excerpt</part-name></score-part>
              </part-list>
              <part id="P1">${measuresXml}</part>
            </score-partwise>`;

            await excerptOsmd.load(excerptXml);
            excerptOsmd.render();
        } catch (e) {
            console.error("Failed to load excerpt preview", e);
            document.getElementById('osmd-excerpt-container').innerHTML =
                '<div class="alert alert-warning">Failed to load excerpt preview.</div>';
        }
    }

    async function loadScore() {
        try {
            await osmd.load(scoreUrl);
            osmd.render();

            totalMeasures = getTotalMeasures();
            if (totalMeasures < MEASURE_COUNT) {
                document.getElementById('measure-selector').innerHTML =
                    `<div class="alert alert-warning">Score has fewer than ${MEASURE_COUNT} measures.</div>`;
                return;
            }

            buildMeasureSelector();
            selectMeasures(0);
        } catch (e) {
            console.error("Failed to load score for preview", e);
            document.getElementById('osmd-container').innerHTML =
                '<div class="alert alert-danger">Failed to load the score for preview.</div>';
        }
    }

    loadScore();
};
