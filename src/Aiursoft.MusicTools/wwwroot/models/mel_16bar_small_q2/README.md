# MusicVAE 16-bar melody checkpoint

`mel_16bar_small_q2` checkpoint from the [official Magenta index](https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md):
https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_16bar_small_q2

Weight bytes are unmodified. Shard filenames have a `.bin` extension (and matching manifest paths) so the existing ASP.NET static-file handler serves them.

Upstream supports downloading and self-hosting checkpoints. The six quantized weight shards and metadata total approximately 23.5 MB. They ship with this application; neither runtime nor builds download them from Google. The original files include an encoder, but only inference weights are decoded into tensors.

`MusicVaeDecoder.js` derives its conductor/categorical decoder and melody event conversion from Magenta.js 1.23.1 (`music_vae/model.ts`, `core/melodies.ts`), copyright 2018 The Magenta Team, under the accompanying Apache-2.0 LICENSE. It uses TFJS 4 functional operations, supports only this checkpoint, and evaluates a 256-step reference context (four steps per beat, 120 BPM). It omits encoders, training, protobuf and unrelated models. Preserve this attribution and license when distributing the port.

Runtime/model upgrades require comparing reference-conditioned logits and complete variations with the reference, checking dependencies and reviewing consecutive unselected listening samples. Workstation CPU timings do not establish mobile browser performance.

## Reference-guided variations

`melody-references.json` contains three monophonic reference scores in C major
(four steps per beat, 256 steps) and their 256-dimensional encoder vectors.
`MusicVaeDecoder.score` decodes each vector while feeding the original events back
at every step. Pitch logits guide linked, bounded edits; the model never changes
the reference timing. The Worker caches those scores for its lifetime. Medium
variation retains the small edit stage before expanding its target to 20% of
attacks, matching the listening experiment. Exact repeated 1/2/4-bar patterns and
same-pitch runs change together; the first/last note and the final two beats of
each four-bar phrase remain fixed. Candidate edits stay within four semitones;
changed transitions avoid tritones and jumps beyond seven semitones. Wider
unchanged source intervals remain intact.

Reference attribution and preparation:

- **Frère Jacques**, traditional melody, first voice in Jean-Baptiste Weckerlin,
  *Chansons et rondes enfantines*, Garnier, 1870, p. 85;
  [Wikisource transcription](https://fr.wikisource.org/wiki/Chansons_et_rondes_enfantines/Fr%C3%A8re_Jacques).
  First sixteen 2/4 bars, uniformly transposed F major to C major, repeated twice;
  quarter-beat timing and written rests retained, regrouped into 4/4. No coda or
  accompaniment from the source is included.
- **Ode to Joy**, Ludwig van Beethoven; [Mutopia 528](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528),
  entered by Peter Chubb, last updated 2009-08-05. The typesetter places this score
  in the public domain. Complete sixteen-bar soprano, uniformly transposed from
  G major to C major; no accompanying voices are included.
- **Au clair de la lune**, traditional melody;
  [1866 score displayed by Wikisource](https://fr.wikisource.org/wiki/Au_clair_de_la_lune_(chanson)).
  Complete sixteen-bar single voice, uniformly transposed down one octave;
  no lyrics or accompaniment are included.

Historical melodies are identified as public-domain works by these sources.
Wikisource contributors are credited for the transcription material under the
site's linked [CC BY-SA license](https://creativecommons.org/licenses/by-sa/4.0/);
reference preparation/transposition is described above and in the data. This
reference-data attribution is separate from the Apache-2.0 decoder attribution.

Only when adding/changing a reference or replacing model weights: check the source
and attribution, quantize the monophonic score to 256 steps, encode it using the
matching official MusicVAE encoder in an isolated evaluation environment, then
review the notes and vector together. Do not add the legacy encoder package to
the application. Compare returned logits with the reference implementation,
verify all twelve major keys/keyboard bounds and listen to consecutive complete
variations before merging. New scores need their own encoding; replacing weights
also requires re-encoding the reference bank. No periodic update is needed while
scores and checkpoint remain unchanged.
