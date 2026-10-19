import { MusicVaeDecoder } from "./MusicVaeDecoder.js";

const decoder = new MusicVaeDecoder();
let ready;
self.onmessage = async ({ data }) => {
    try {
        ready ??= decoder.initialize(data.modelUrl);
        await ready;
        self.postMessage({ notes: decoder.sample() });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
