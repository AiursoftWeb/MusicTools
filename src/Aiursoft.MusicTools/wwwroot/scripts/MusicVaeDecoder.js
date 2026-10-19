// Copyright 2018 The Magenta Team. Licensed under Apache-2.0.
// Derived from Magenta.js 1.23.1 music_vae/model and core/melodies.
// Modified for single-sample inference with TFJS 4 functional operations.
// This port omits encoders, training, protobuf, controls and other model types.
// See models/mel_16bar_small_q2/README.md and LICENSE for source and attribution.
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-cpu";

const CONDUCTOR = "decoder/hierarchical_level_0/";
const DECODER = "core_decoder/decoder/";

function dense(weights, prefix, input) {
    return tf.add(tf.matMul(input, weights[`${prefix}/kernel`]), weights[`${prefix}/bias`]);
}

function cells(weights, prefix, initial, statePrefix) {
    const states = tf.split(tf.tanh(dense(weights, statePrefix, initial)), 4, 1);
    const forget = tf.scalar(1);
    return {
        cell: [0, 1].map(i => (input, c, h) => tf.basicLSTMCell(forget,
            weights[`${prefix}${i}/lstm_cell/kernel`],
            weights[`${prefix}${i}/lstm_cell/bias`], input, c, h)),
        c: [states[0], states[2]], h: [states[1], states[3]],
    };
}

export class MusicVaeDecoder {
    async initialize(baseUrl) {
        await tf.setBackend("cpu");
        await tf.ready();
        const response = await fetch(`${baseUrl}/weights_manifest.json`);
        if (!response.ok) throw new Error("Model manifest could not be loaded.");
        const manifest = await response.json();
        // Keep the checkpoint unchanged, but only decode inference weights.
        const names = manifest.flatMap(group => group.weights.map(weight => weight.name))
            .filter(name => name.startsWith(CONDUCTOR) || name.startsWith(DECODER));
        this.weights = await tf.io.loadWeights(manifest, baseUrl, names);
    }

    sample() {
        if (!this.weights) throw new Error("Model is not initialized.");
        const labels = tf.tidy(() => {
            const z = tf.randomNormal([1, 256]);
            const conductor = cells(this.weights, `${CONDUCTOR}cell_`, z,
                `${CONDUCTOR}initial_state`);
            const dummy = tf.zeros([1, 1]);
            const bars = [];
            let input = tf.zeros([1, 90]);
            for (let bar = 0; bar < 16; bar++) {
                [conductor.c, conductor.h] = tf.multiRNNCell(
                    conductor.cell, dummy, conductor.c, conductor.h);
                const embedding = conductor.h[1];
                const decoder = cells(this.weights, `${DECODER}multi_rnn_cell/cell_`,
                    embedding, `${DECODER}z_to_initial_state`);
                const samples = [];
                for (let step = 0; step < 16; step++) {
                    [decoder.c, decoder.h] = tf.multiRNNCell(decoder.cell,
                        tf.concat([input, embedding], 1), decoder.c, decoder.h);
                    const logits = dense(this.weights, `${DECODER}output_projection`, decoder.h[1]);
                    const label = tf.reshape(tf.multinomial(tf.div(logits, tf.scalar(0.5)), 1), [-1]);
                    input = tf.cast(tf.oneHot(label, 90), "float32");
                    samples.push(input);
                }
                bars.push(tf.stack(samples, 1));
            }
            return tf.argMax(tf.squeeze(tf.concat(bars, 1), [0]), 1);
        });
        try {
            const events = labels.dataSync();
            const notes = [];
            let current = null;
            for (let step = 0; step < events.length; step++) {
                const event = events[step];
                if (event === 0) continue;
                if (current) {
                    current.end = step;
                    notes.push(current);
                    current = null;
                }
                if (event >= 2) current = { pitch: event - 2 + 21, start: step, end: 256 };
            }
            if (current) notes.push(current);
            return notes;
        } finally {
            labels.dispose();
        }
    }
}
