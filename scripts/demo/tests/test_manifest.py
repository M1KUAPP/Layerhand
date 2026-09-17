import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


DEMO_DIR = Path(__file__).resolve().parents[1]


class NarrationManifestTests(unittest.TestCase):
    def test_resolves_beat_offsets_and_records_the_next_visual_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            beats = [
                {'name': 'landing', 'ms': 1000},
                {'name': 'results', 'ms': 5000},
                {'name': 'end', 'ms': 9000},
            ]
            (root / 'beats.json').write_text(json.dumps(beats), encoding='utf-8')
            script = root / 'narration.txt'
            script.write_text('landing | 100 | First line.\nresults | 200 | Second line.\n', encoding='utf-8')

            result = subprocess.run(
                [sys.executable, str(DEMO_DIR / 'manifest.py'), str(root), str(script)],
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            lines = json.loads((root / 'lines.json').read_text(encoding='utf-8'))
            self.assertEqual(
                lines,
                [
                    {'beat': 'landing', 'ms': 1100, 'visual_end_ms': 5000, 'text': 'First line.'},
                    {'beat': 'results', 'ms': 5200, 'visual_end_ms': 9000, 'text': 'Second line.'},
                ],
            )

    def test_missing_narrated_beat_is_fatal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'beats.json').write_text(
                json.dumps([{'name': 'landing', 'ms': 1000}]), encoding='utf-8'
            )
            script = root / 'narration.txt'
            script.write_text('landing | 100 | First.\nresults | 100 | Missing.\n', encoding='utf-8')

            result = subprocess.run(
                [sys.executable, str(DEMO_DIR / 'manifest.py'), str(root), str(script)],
                capture_output=True,
                text=True,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("beat 'results' never happened", result.stderr)
            self.assertFalse((root / 'lines.json').exists())


if __name__ == '__main__':
    unittest.main()
