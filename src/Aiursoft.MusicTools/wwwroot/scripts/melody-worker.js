import { MusicVaeDecoder } from "./MusicVaeDecoder.js";
import { createVariation, prepareReference } from "./MelodyVariations.js";

const decoder = new MusicVaeDecoder();
const scores = new Map();
let references;
let ready;

async function initialize(modelUrl) {
    const response = await fetch(`${modelUrl}/melody-references.json`);
    if (!response.ok) throw new Error("Reference melodies could not be loaded.");
    references = await response.json();
    if (!Array.isArray(references) || references.length === 0) throw new Error("Invalid reference melodies.");
    const ids = new Set();
    for (const reference of references) {
        if (typeof reference.id !== "string" || ids.has(reference.id) ||
            !Array.isArray(reference.latent) || reference.latent.length !== 256 ||
            reference.latent.some(value => !Number.isFinite(value)) ||
            !Array.isArray(reference.notes) || reference.notes.length === 0) {
            throw new Error("Invalid reference melody.");
        }
        ids.add(reference.id);
        let previousEnd = 0;
        for (const note of reference.notes) {
            if (!Array.isArray(note) || note.length !== 3 || note.some(value => !Number.isInteger(value)) ||
                note[0] < 48 || note[0] > 72 || note[1] < previousEnd || note[2] <= note[1] || note[2] > 256) {
                throw new Error("Invalid reference note.");
            }
            previousEnd = note[2];
        }
    }
    await decoder.initialize(modelUrl);
}

self.onmessage = async ({ data }) => {
    try {
        if (!Number.isInteger(data.key) || data.key < 0 || data.key > 11) throw new Error("Invalid melody key.");
        ready ??= initialize(data.modelUrl);
        await ready;
        const plans = references.map(reference => prepareReference(reference, data.key)).filter(Boolean);
        if (!plans.length) throw new Error("No playable reference is available in this key.");
        let result;
        // Keep retries finite; a limited source collection can eventually repeat.
        for (let attempt = 0; attempt < 8; attempt++) {
            const plan = plans[Math.floor(Math.random() * plans.length)];
            if (!scores.has(plan.reference.id)) scores.set(plan.reference.id, decoder.score(plan.reference));
            result = createVariation(plan, scores.get(plan.reference.id));
            if (!data.recent?.includes(result.fingerprint)) break;
        }
        self.postMessage(result);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
