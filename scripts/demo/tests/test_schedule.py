import json
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path


DEMO_DIR = Path(__file__).resolve().parents[1]


def write_silence(path: Path, duration_ms: int) -> None:
    frames = int(24_000 * duration_ms / 1000)
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(b'\0\0' * frames)


class NarrationScheduleTests(unittest.TestCase):
    def test_rejects_audio_that_outlives_its_visual_beat(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'seg').mkdir()
            lines = [{'beat': 'intake', 'ms': 500, 'visual_end_ms': 1500, 'text': 'Visible intake narration.'}]
            (root / 'lines.json').write_text(json.dumps(lines), encoding='utf-8')
            write_silence(root / 'seg/0.wav', 1400)

            result = subprocess.run(
                [sys.executable, str(DEMO_DIR / 'schedule.py'), str(root)],
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 1)
            self.assertIn('VISUAL OVERRUN', result.stderr)


if __name__ == '__main__':
    unittest.main()
