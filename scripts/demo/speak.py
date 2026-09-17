"""Synthesize Layerhand's demo narration with Kokoro or a cloned Chatterbox voice.

The models live outside the repository. Both supported engines have permissive
licenses: Kokoro is Apache 2.0 and Chatterbox is MIT.
"""

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path


# Models live outside the repo: Kokoro alone is 311 MB and has no business in a git
# checkout. XDG-style default rather than a personal folder, so it is the same path
# on every machine. KOKORO_HOME overrides it.
def _resolve_kokoro_home() -> Path:
    if 'KOKORO_HOME' in os.environ:
        return Path(os.environ['KOKORO_HOME'])
    default_dir = Path.home() / '.local/share/layerhand-demo'
    if (default_dir / 'kokoro-v1.0.onnx').exists():
        return default_dir
    return default_dir


HERE = _resolve_kokoro_home()
VOICE = os.environ.get('DEMO_VOICE', 'jf_nezumi')

# Chatterbox cloned voice configuration
CB_HOME = Path(os.environ.get('CHATTERBOX_HOME', Path.home() / '.local/share/layerhand-demo/chatterbox'))
CB_REF = Path(os.environ.get('CHATTERBOX_REF', CB_HOME / 'reference.wav'))
CB_VARIANT = os.environ.get('CHATTERBOX_VARIANT', 'nano')

# Kokoro is the practical default if its local runtime/models are available;
# otherwise Chatterbox is retained with a documented fallback strategy.
_kokoro_ready = (HERE / 'kokoro-v1.0.onnx').exists() and (HERE / 'voices-v1.0.bin').exists()
TTS = os.environ.get('DEMO_TTS', 'kokoro' if _kokoro_ready else 'chatterbox')
# The stock Kokoro read of this script is too long for the investor cut at 1.0;
# Chatterbox is already measured at the intended cadence and stays unmodified.
DEFAULT_SPEED = '1.15' if TTS == 'kokoro' else '1.0'
SPEED = float(os.environ.get('DEMO_SPEED', DEFAULT_SPEED))


def chatterbox_cache_path(text):
    cache = Path(os.environ.get('CHATTERBOX_CACHE', CB_HOME / 'cache'))
    voice_hash = hashlib.sha256(CB_REF.read_bytes()).hexdigest()
    prefix = f'{CB_VARIANT}:{voice_hash}:{SPEED}'
    key = hashlib.sha256(f'{prefix}:{text}'.encode()).hexdigest()
    return cache / f'{key}.wav'


class ChatterboxRenderer:
    """Load Chatterbox once and render one or many cached PCM16 segments.

    THE ATTENTION SETTING IS NOT OPTIONAL. On this hardware the fused attention
    kernel emits all-NaN audio -- 180,960 of 180,960 samples on the first run -- and
    the failure surfaces two layers away, as `Audio buffer is not finite everywhere`
    raised by librosa inside the Perth watermarker. It reads as a watermarker bug and
    is not one. The tell is `Could not initialize NNPACK! Reason: Unsupported
    hardware` in the startup log. Eager attention plus the MATH SDPA backend produces
    finite audio; drop either and the narration is silence with a confusing traceback.
    """
    def __init__(self):
        import torch

        # Must precede every Chatterbox model import on this CPU. The Nano and
        # base decoders both produce non-finite audio through the fused path.
        torch.backends.mkldnn.enabled = False

        import torchaudio

        self.torch = torch
        self.torchaudio = torchaudio
        if CB_VARIANT == 'base':
            from chatterbox.tts import ChatterboxTTS

            self.model = ChatterboxTTS.from_pretrained(device='cpu')
            self.model.t3.tfmr.config._attn_implementation = 'eager'
            for module in self.model.t3.tfmr.modules():
                if hasattr(module, 'config'):
                    module.config._attn_implementation = 'eager'
        elif CB_VARIANT in {'nano', 'turbo'}:
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            self.model = ChatterboxTurboTTS.from_pretrained(device='cpu', nano=CB_VARIANT == 'nano')
        else:
            raise ValueError(f'unsupported CHATTERBOX_VARIANT={CB_VARIANT!r}; use nano, turbo, or base')
        # Voice encoding is identical for every line in a cut. Preparing it
        # once avoids re-running the reference encoder for every sentence.
        with self._attention_context():
            self.model.prepare_conditionals(str(CB_REF))
        chatterbox_cache_path('cache-probe').parent.mkdir(parents=True, exist_ok=True)

    def _attention_context(self):
        return self.torch.nn.attention.sdpa_kernel(self.torch.nn.attention.SDPBackend.MATH)

    def render(self, text, out):
        cached = chatterbox_cache_path(text)
        if cached.exists():
            shutil.copyfile(cached, out)
            return True

        with self._attention_context():
            wav = self.model.generate(text)
        if not self.torch.isfinite(wav).all():
            print('chatterbox produced non-finite audio; refusing to write silence', file=sys.stderr)
            return False
        if SPEED != 1:
            wav = self.torchaudio.functional.resample(wav, self.model.sr, round(self.model.sr / SPEED))
        # int16, matching what Kokoro writes. Python's wave module rejects the
        # IEEE-float WAV that torchaudio otherwise writes by default.
        self.torchaudio.save(cached, wav, self.model.sr, encoding='PCM_S', bits_per_sample=16)
        shutil.copyfile(cached, out)
        return True


class KokoroRenderer:
    def __init__(self):
        import numpy as np
        import soundfile as sf
        from kokoro_onnx import Kokoro

        model, voices = HERE / 'kokoro-v1.0.onnx', HERE / 'voices-v1.0.bin'
        for path in (model, voices):
            if not path.exists():
                raise FileNotFoundError(f'missing {path}. See scripts/demo/README.md for the download.')
        self.np = np
        self.sf = sf
        self.model = Kokoro(str(model), str(voices))

    def render(self, text, out):
        audio, rate = self.model.create(text, voice=VOICE, speed=SPEED, lang='en-us')
        if not self.np.isfinite(audio).all():
            print('kokoro produced non-finite audio; refusing to write silence', file=sys.stderr)
            return False
        self.sf.write(out, audio, rate, subtype='PCM_16')
        return True


def renderer_factory():
    return ChatterboxRenderer() if TTS == 'chatterbox' else KokoroRenderer()


def render_batch(lines, output_dir, renderer_factory=renderer_factory):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if not lines:
        return 0
    for index, line in enumerate(lines):
        if not isinstance(line, dict) or not isinstance(line.get('text'), str) or not line['text'].strip():
            print(f'line {index} must contain non-empty text', file=sys.stderr)
            return 2
    if TTS == 'chatterbox':
        cached = [chatterbox_cache_path(line['text'].strip()) for line in lines]
        if all(path.exists() for path in cached):
            for index, path in enumerate(cached):
                shutil.copyfile(path, output_dir / f'{index}.wav')
            return 0
    renderer = renderer_factory()
    for index, line in enumerate(lines):
        if not renderer.render(line['text'].strip(), output_dir / f'{index}.wav'):
            return 1
    return 0


def in_chatterbox_venv(prefix=None):
    """Compare venv roots; uv-managed Python executables share one symlink target."""
    active_prefix = Path(sys.prefix if prefix is None else prefix)
    return active_prefix.resolve() == (CB_HOME / '.venv').resolve()


def chatterbox_runtime(args, input_text=None):
    if TTS != 'chatterbox':
        return None
    cb_python = CB_HOME / '.venv/bin/python'
    if not cb_python.exists():
        print(f'missing {cb_python}. See scripts/demo/README.md for the install.', file=sys.stderr)
        return 1
    if not CB_REF.exists():
        print(f'missing reference clip {CB_REF}. Set CHATTERBOX_REF to a clean 10-20 second clip.', file=sys.stderr)
        return 1
    if not in_chatterbox_venv():
        import subprocess

        return subprocess.run([str(cb_python), __file__, *args], input=input_text, text=True).returncode
    return None


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == '--batch':
        if len(sys.argv) != 4:
            print('usage: speak.py --batch <lines.json> <output-dir>', file=sys.stderr)
            return 2
        try:
            lines = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as error:
            print(f'failed to read lines.json: {error}', file=sys.stderr)
            return 2
        if not isinstance(lines, list):
            print('lines.json must contain an array', file=sys.stderr)
            return 2
        output_dir = Path(sys.argv[3])
        output_dir.mkdir(parents=True, exist_ok=True)
        if not lines:
            return 0
        runtime_result = chatterbox_runtime(sys.argv[1:])
        if runtime_result is not None:
            return runtime_result
        return render_batch(lines, output_dir)
    if len(sys.argv) < 2:
        print('usage: speak.py <out.wav>   (text on stdin)', file=sys.stderr)
        return 2
    text = sys.stdin.read().strip()
    if not text:
        print('no text on stdin', file=sys.stderr)
        return 2

    runtime_result = chatterbox_runtime(sys.argv[1:], text)
    if runtime_result is not None:
        return runtime_result
    try:
        renderer = renderer_factory()
    except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0 if renderer.render(text, Path(sys.argv[1])) else 1


if __name__ == '__main__':
    sys.exit(main())
