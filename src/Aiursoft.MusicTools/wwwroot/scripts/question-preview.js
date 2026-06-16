import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import OsmdAudioPlayer from 'osmd-audio-player';
import JSZip from 'jszip';

window.startQuestionPreview = () => {
    const osmd = new OpenSheetMusicDisplay("osmd-container", {
        autoResize: true,
        backend: "svg",
        drawTitle: false,
        drawMeasureNumbers: false
    });

    const audioPlayer = new OsmdAudioPlayer();
    const scoreUrl = document.getElementById('score-url').textContent;
    const startMeasure = parseInt(document.getElementById('start-measure').textContent);
    const measureCount = parseInt(document.getElementById('measure-count').textContent);
    let isPlaying = false;

    async function loadAndExtractExcerpt() {
        try {
            const response = await fetch(scoreUrl);
            if (!response.ok) throw new Error("Failed to fetch score");
            const blob = await response.blob();

            let xmlString;
            if (blob.type.includes('zip') || scoreUrl.endsWith('.mxl')) {
                const zip = await JSZip.loadAsync(await blob.arrayBuffer());
                let entry = null;
                for (let name of Object.keys(zip.files)) {
                    if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
                        entry = zip.files[name]; break;
                    }
                }
                if (!entry) throw new Error("No XML in MXL");
                xmlString = await entry.async("string");
            } else {
                xmlString = await blob.text();
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");
            const measures = xmlDoc.getElementsByTagName("measure");

            let attributesNode = null;
            for (let i = 0; i <= startMeasure; i++) {
                const attrs = measures[i].getElementsByTagName("attributes");
                if (attrs.length > 0) attributesNode = attrs[0];
            }

            let measuresXml = "";
            for (let i = 0; i < measureCount; i++) {
                let mXml = new XMLSerializer().serializeToString(measures[startMeasure + i]);
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

            await osmd.load(excerptXml);
            osmd.render();
            audioPlayer.loadScore(osmd);
        } catch (e) {
            console.error("Failed to load excerpt", e);
            document.getElementById('osmd-container').innerHTML =
                '<div class="alert alert-danger">Failed to load the excerpt for preview.</div>';
        }
    }

    document.getElementById('btn-play').addEventListener('click', async () => {
        if (isPlaying) return;
        isPlaying = true;
        const btn = document.getElementById('btn-play');
        btn.disabled = true;
        try { await audioPlayer.play(); } catch(e) { console.log('Playback error'); }
        finally { isPlaying = false; btn.disabled = false; }
    });

    loadAndExtractExcerpt();
};
