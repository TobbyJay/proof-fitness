# Third-party notices

Proof Fitness itself is licensed under the MIT License. The maintainer-only audio pipeline and generated output involve the following third-party works.

## Kokoro inference library

- Project: `kokoro` 0.9.4 by Hexgrad
- Source: <https://github.com/hexgrad/kokoro>
- Package: <https://pypi.org/project/kokoro/0.9.4/>
- Licence: Apache License 2.0, as declared in the package's `LICENSE` file and PyPI metadata
- Use here: local, maintainer-only inference; it is not shipped to or installed for ordinary app users

## Kokoro-82M model and fixed voice

- Model: `hexgrad/Kokoro-82M`, v1.0
- Model card: <https://huggingface.co/hexgrad/Kokoro-82M>
- Licence: Apache License 2.0, as declared by the model repository
- Selected fixed voice: `bf_emma` (British English)
- Voice information: <https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md>

The model weights and voice tensor are downloaded to a maintainer's local Hugging Face cache and are not redistributed in this repository. The model card lists CC BY training-data attribution for Koniwa `tnc` (CC BY 3.0) and SIWIS (CC BY 4.0); its voice table does not list a separate voice-specific CC BY source for `bf_emma`. This notice does not claim rights beyond the licences published by those upstream sources.

## Misaki

- Project: `misaki` 0.9.4 by Hexgrad
- Source: <https://github.com/hexgrad/misaki>
- Licence: Apache License 2.0, as declared in its package `LICENSE`
- Use here: local grapheme-to-phoneme processing for maintainers

## eSpeak NG

- Project: eSpeak NG
- Source: <https://github.com/espeak-ng/espeak-ng>
- Licence: GNU General Public License version 3 or later, with other licences applying to identified bundled data; see the upstream `COPYING` and documentation
- Use here: an optional local phonemisation fallback used by Misaki for out-of-dictionary English words, not the voice engine and not an app runtime dependency

## FFmpeg

- Project: FFmpeg
- Source and licence information: <https://ffmpeg.org/legal.html>
- Licence: FFmpeg is primarily LGPL 2.1 or later, but a particular build may include optional GPL components and codecs
- Use here: maintainer-only assembly, filtering, analysis, and encoding

Maintainers are responsible for checking the configuration and licence of the FFmpeg build they use. FFmpeg binaries and libraries are not distributed in this repository.

## Generated chimes

All transition chimes in the committed tracks are generated programmatically by Proof Fitness from sine waves. No ringtone, music recording, or third-party sound sample is used.
