import json
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path


DEMO_DIR = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('demo_speak', DEMO_DIR / 'speak.py')
speak = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(speak)


class BatchSpeechTests(unittest.TestCase):
    def test_default_speed_keeps_kokoro_inside_the_demo_window_without_rushing_chatterbox(self) -> None:
        probe = (
            "import importlib.util; "
            f"s=importlib.util.spec_from_file_location('probe', {str(DEMO_DIR / 'speak.py')!r}); "
            "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.SPEED)"
        )
        measured = {}
        for engine in ('kokoro', 'chatterbox'):
            env = {**os.environ, 'DEMO_TTS': engine}
            env.pop('DEMO_SPEED', None)
            result = subprocess.run([sys.executable, '-c', probe], capture_output=True, text=True, env=env)
            self.assertEqual(result.returncode, 0, result.stderr)
            measured[engine] = float(result.stdout.strip())

        self.assertEqual(measured, {'kokoro': 1.15, 'chatterbox': 1.0})

    def test_chatterbox_runtime_pins_legacy_setuptools_for_perth(self) -> None:
        requirements = (DEMO_DIR / 'chatterbox-requirements.txt').read_text(encoding='utf-8')

        self.assertIn('chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2', requirements)
        self.assertIn('setuptools<81', requirements)

    def test_chatterbox_prepares_the_reference_once_per_batch(self) -> None:
        source = (DEMO_DIR / 'speak.py').read_text(encoding='utf-8')

        self.assertIn('self.model.prepare_conditionals(str(CB_REF))', source)
        self.assertNotIn("self.model.generate(text, audio_prompt_path=str(CB_REF))", source)

    def test_chatterbox_uses_the_cpu_nano_variant_by_default(self) -> None:
        source = (DEMO_DIR / 'speak.py').read_text(encoding='utf-8')

        self.assertIn("CHATTERBOX_VARIANT', 'nano'", source)
        self.assertIn('from chatterbox.tts_turbo import ChatterboxTurboTTS', source)
        self.assertIn("nano=CB_VARIANT == 'nano'", source)

    def test_chatterbox_runtime_detects_the_virtualenv_prefix_not_python_symlink(self) -> None:
        self.assertTrue(hasattr(speak, 'in_chatterbox_venv'))
        root = Path(self.temp.name) / 'chatterbox'

        original = speak.CB_HOME
        speak.CB_HOME = root
        try:
            self.assertTrue(speak.in_chatterbox_venv(root / '.venv'))
            self.assertFalse(speak.in_chatterbox_venv(Path(self.temp.name) / 'kokoro/.venv'))
        finally:
            speak.CB_HOME = original

    def test_fully_cached_chatterbox_batch_skips_model_construction(self) -> None:
        self.assertTrue(hasattr(speak, 'chatterbox_cache_path'))
        root = Path(self.temp.name)
        reference = root / 'reference.wav'
        reference.write_bytes(b'reference')
        output = root / 'rendered'
        text = 'Already rendered narration.'
        originals = (speak.TTS, speak.CB_REF, speak.CB_VARIANT, speak.SPEED)
        speak.TTS = 'chatterbox'
        speak.CB_REF = reference
        speak.CB_VARIANT = 'nano'
        speak.SPEED = 1.0
        try:
            with mock.patch.dict(os.environ, {'CHATTERBOX_CACHE': str(root / 'cache')}):
                cached = speak.chatterbox_cache_path(text)
                cached.parent.mkdir(parents=True)
                cached.write_bytes(b'cached wav')
                result = speak.render_batch(
                    [{'text': text}],
                    output,
                    renderer_factory=lambda: self.fail('cached batches must not load a model'),
                )
        finally:
            speak.TTS, speak.CB_REF, speak.CB_VARIANT, speak.SPEED = originals

        self.assertEqual(result, 0)
        self.assertEqual((output / '0.wav').read_bytes(), b'cached wav')

    def run_batch(self, manifest):
        root = Path(self.temp.name)
        lines = root / 'lines.json'
        lines.write_text(json.dumps(manifest), encoding='utf-8')
        env = {**os.environ, 'DEMO_TTS': 'chatterbox'}
        return subprocess.run(
            [sys.executable, str(DEMO_DIR / 'speak.py'), '--batch', str(lines), str(root / 'seg')],
            capture_output=True,
            text=True,
            env=env,
        )

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_empty_batch_succeeds_without_loading_a_model(self) -> None:
        result = self.run_batch([])

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((Path(self.temp.name) / 'seg').is_dir())

    def test_batch_rejects_a_non_array_manifest_before_loading_a_model(self) -> None:
        result = self.run_batch({'text': 'not an array'})

        self.assertEqual(result.returncode, 2)
        self.assertIn('lines.json must contain an array', result.stderr)

    def test_nonempty_batch_constructs_one_renderer_for_all_lines(self) -> None:
        self.assertTrue(hasattr(speak, 'render_batch'), 'speak.py must expose batch rendering')
        output = Path(self.temp.name) / 'rendered'
        factory_calls = []
        rendered = []

        class Renderer:
            def render(self, text, path):
                rendered.append(text)
                path.write_bytes(text.encode())
                return True

        def factory():
            factory_calls.append(1)
            return Renderer()

        original_tts = speak.TTS
        speak.TTS = 'kokoro'
        try:
            result = speak.render_batch(
                [{'text': 'First visible beat.'}, {'text': 'Second visible beat.'}],
                output,
                renderer_factory=factory,
            )
        finally:
            speak.TTS = original_tts

        self.assertEqual(result, 0)
        self.assertEqual(len(factory_calls), 1)
        self.assertEqual(rendered, ['First visible beat.', 'Second visible beat.'])
        self.assertEqual((output / '0.wav').read_bytes(), b'First visible beat.')
        self.assertEqual((output / '1.wav').read_bytes(), b'Second visible beat.')


if __name__ == '__main__':
    unittest.main()
