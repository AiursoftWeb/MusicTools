// Reference-guided medium variations. All timings and linked motifs stay intact.
export function prepareReference(reference, key) {
    const notes = reference.notes.map(([pitch, start, end]) => ({ pitch, start, end }));
    const low = Math.min(...notes.map(note => note.pitch));
    const high = Math.max(...notes.map(note => note.pitch));
    const shifts = Array.from({ length: 73 }, (_, i) => i - 36)
        .filter(shift => ((shift % 12) + 12) % 12 === key && low + shift >= 48 && high + shift <= 72)
        .sort((a, b) => Math.abs((low + high) / 2 + a - 60) - Math.abs((low + high) / 2 + b - 60) ||
            Math.abs(a) - Math.abs(b) || a - b);
    if (!shifts.length) return null;
    const shift = shifts[0];
    const allowed = Array.from({ length: 25 }, (_, i) => i + 48)
        .filter(pitch => [0, 2, 4, 5, 7, 9, 11].includes(pitch % 12) &&
            pitch + shift >= 48 && pitch + shift <= 72);
    return { reference, notes, shift, allowed };
}

function linkedGroups(notes) {
    const parent = notes.map((_, i) => i);
    const find = i => {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    };
    const union = (i, j) => { parent[find(j)] = find(i); };
    for (let i = 1; i < notes.length; i++) {
        if (notes[i].pitch === notes[i - 1].pitch) union(i - 1, i);
    }
    for (const length of [16, 32, 64]) {
        const seen = new Map();
        for (let start = 0; start < 256; start += length) {
            const indices = notes.map((_, i) => i)
                .filter(i => notes[i].start >= start && notes[i].start < start + length);
            if (!indices.length) continue;
            const signature = JSON.stringify(indices.map(i => [notes[i].pitch,
                notes[i].start - start, notes[i].end - start]));
            const previous = seen.get(signature);
            if (previous) indices.forEach((index, i) => union(previous[i], index));
            else seen.set(signature, indices);
        }
    }
    const groups = new Map();
    notes.forEach((_, i) => {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(i);
    });
    return [...groups.values()].sort((a, b) => a[0] - b[0]).map(indices => ({
        indices, pitch: notes[indices[0]].pitch,
        locked: indices.some(i => i === 0 || i === notes.length - 1 ||
            notes[i].end > (Math.floor(notes[i].start / 64) + 1) * 64 - 8),
    }));
}

function validTransitions(pitches, original) {
    return pitches.every((pitch, i) => i === 0 ||
        (pitch === original[i] && pitches[i - 1] === original[i - 1]) ||
        (Math.abs(pitch - pitches[i - 1]) <= 7 && Math.abs(pitch - pitches[i - 1]) !== 6));
}

function contourPenalty(pitches, original) {
    let cost = 0;
    for (let i = 1; i < pitches.length; i++) {
        const delta = pitches[i] - pitches[i - 1];
        const before = original[i] - original[i - 1];
        cost += Math.max(0, Math.abs(delta) - 2) * 0.25;
        if (delta * before < 0) cost += 2;
        if (before !== 0 && delta === 0) cost += 0.35;
    }
    return cost;
}

export function createVariation(plan, logits, random = Math.random) {
    const { reference, notes, shift, allowed } = plan;
    const original = notes.map(note => note.pitch);
    const groups = linkedGroups(notes);
    const candidates = [];
    groups.forEach((group, index) => {
        if (group.locked) return;
        for (const pitch of allowed) {
            const distance = Math.abs(pitch - group.pitch);
            if (distance === 0 || distance > 4) continue;
            const loss = group.indices.reduce((sum, i) => sum +
                logits[notes[i].start][group.pitch - 19] - logits[notes[i].start][pitch - 19], 0) /
                group.indices.length;
            const jitter = -Math.log(-Math.log(Math.max(1e-12, random())));
            candidates.push({ group: index, pitch, priority: loss + 0.35 * distance - 2 * jitter });
        }
    });
    let current = [...original];
    const used = new Set();
    // Retain the small-stage edits before extending to the accepted medium budget.
    for (const fraction of [0.1, 0.2]) {
        const target = Math.round(notes.length * fraction);
        while (true) {
            const count = current.filter((pitch, i) => pitch !== original[i]).length;
            const before = contourPenalty(current, original);
            const moves = [];
            for (const candidate of candidates) {
                if (used.has(candidate.group)) continue;
                const indices = groups[candidate.group].indices;
                const distance = Math.abs(count + indices.length - target);
                if (distance >= Math.abs(count - target)) continue;
                const proposed = [...current];
                indices.forEach(i => { proposed[i] = candidate.pitch; });
                if (!validTransitions(proposed, original)) continue;
                const cost = candidate.priority + (contourPenalty(proposed, original) - before) / indices.length;
                moves.push({ candidate, proposed, distance, cost });
            }
            moves.sort((a, b) => a.cost - b.cost || a.distance - b.distance ||
                a.candidate.group - b.candidate.group || a.candidate.pitch - b.candidate.pitch);
            if (!moves.length) break;
            current = moves[0].proposed;
            used.add(moves[0].candidate.group);
        }
    }
    if (current.every((pitch, i) => pitch === original[i])) {
        throw new Error("No playable melody variation is available.");
    }
    return {
        notes: notes.map((note, i) => ({ ...note, pitch: current[i] + shift })),
        fingerprint: `${reference.id}:${current.join(",")}`,
    };
}
