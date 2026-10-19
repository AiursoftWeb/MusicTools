# MusicVAE 16-bar melody checkpoint

`mel_16bar_small_q2` checkpoint from the [official Magenta index](https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md):
https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_16bar_small_q2

Weight bytes are unmodified. Shard filenames have a `.bin` extension (and matching manifest paths) so the existing ASP.NET static-file handler serves them.

Upstream supports downloading and self-hosting checkpoints. The six quantized weight shards and metadata total approximately 23.5 MB. They ship with this application; neither runtime nor builds download them from Google. The original files include an encoder, but only inference weights are decoded into tensors.

`MusicVaeDecoder.js` derives its conductor/categorical decoder and melody event conversion from Magenta.js 1.23.1 (`music_vae/model.ts`, `core/melodies.ts`), copyright 2018 The Magenta Team, under the accompanying Apache-2.0 LICENSE. It uses TFJS 4 functional operations, supports only this checkpoint, and samples one 256-step melody at temperature 0.5 (four steps per beat, 120 BPM). It omits encoders, training, protobuf and unrelated models. Preserve this attribution and license when distributing the port.

Runtime/model upgrades require comparing complete decoded sequences with the reference, checking dependencies and reviewing consecutive unselected listening samples. Workstation CPU timings do not establish mobile browser performance.
