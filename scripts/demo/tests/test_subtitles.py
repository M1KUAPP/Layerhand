import importlib.util
import json
import re
import tempfile
import unittest
import wave
from pathlib import Path


DEMO_DIR = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('demo_subtitles', DEMO_DIR / 'subtitles.py')
subtitles = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(subtitles)


def write_silence(path: Path, duration_ms: int) -> None:
    frames = int(24_000 * duration_ms / 1000)
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(b'\0\0' * frames)


class SubtitleLayoutTests(unittest.TestCase):
    def test_odd_wrapped_lines_keep_the_final_phrase_on_one_card(self) -> None:
        text = 'The preview updates her annual relief to fourteen thousand five hundred fifty-eight ringgit.'

        self.assertEqual(
            subtitles.cards(text),
            [
                'The preview updates her annual',
                'relief to fourteen thousand five\nhundred fifty-eight ringgit.',
            ],
        )

    def test_burn_style_is_small_geist_low_and_uses_compact_backing(self) -> None:
        script = (DEMO_DIR / 'narrate.sh').read_text(encoding='utf-8')

        self.assertIn('FontName=Geist', script)
        size = re.search(r'FontSize=([0-9.]+)', script)
        margin = re.search(r'MarginV=([0-9]+)', script)
        backing = re.search(r'Outline=([0-9.]+)', script)
        self.assertIsNotNone(size)
        self.assertIsNotNone(margin)
        self.assertIsNotNone(backing)
        self.assertLessEqual(float(size.group(1)), 11)
        self.assertLessEqual(int(margin.group(1)), 14)
        self.assertLessEqual(float(backing.group(1)), 1)

    def test_generated_cards_fit_two_short_rows_without_overlapping_cues(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'seg').mkdir()
            text = 'Every matched scheme explains the decision and links directly to official evidence.'
            (root / 'lines.json').write_text(json.dumps([{'ms': 1000, 'text': text}]), encoding='utf-8')
            write_silence(root / 'seg/0.wav', 4200)

            srt = subtitles.build(root).read_text(encoding='utf-8')
            cues = [block.splitlines() for block in srt.strip().split('\n\n')]

            previous_end = None
            for cue in cues:
                timing = cue[1]
                start, end = timing.split(' --> ')
                rows = cue[2:]
                self.assertLessEqual(len(rows), 2)
                self.assertTrue(all(len(row) <= 36 for row in rows))
                if previous_end is not None:
                    self.assertLessEqual(previous_end, start)
                previous_end = end


if __name__ == '__main__':
    unittest.main()
