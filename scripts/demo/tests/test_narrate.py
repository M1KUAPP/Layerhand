import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


DEMO_DIR = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg is required')
class NarrateIntegrationTests(unittest.TestCase):
    def test_duration_guard_defaults_to_the_walkthrough_window(self) -> None:
        script = (DEMO_DIR / 'narrate.sh').read_text(encoding='utf-8')

        self.assertIn('DEMO_MIN_DURATION:-30', script)
        self.assertIn('DEMO_MAX_DURATION:-120', script)

    def test_voice_bus_is_normalized_for_clear_dialogue(self) -> None:
        script = (DEMO_DIR / 'narrate.sh').read_text(encoding='utf-8')

        self.assertIn('loudnorm=I=-18:TP=-2:LRA=7', script)

    def test_narration_uses_one_batch_speaker_process(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'capture.mp4'
            bgm = root / 'bgm.wav'
            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-loglevel',
                    'error',
                    '-f',
                    'lavfi',
                    '-i',
                    'color=c=white:s=320x180:d=3',
                    '-pix_fmt',
                    'yuv420p',
                    str(source),
                ],
                check=True,
            )
            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-loglevel',
                    'error',
                    '-f',
                    'lavfi',
                    '-i',
                    'sine=frequency=220:duration=3',
                    '-f',
                    'lavfi',
                    '-i',
                    'sine=frequency=330:duration=3',
                    '-filter_complex',
                    '[0:a][1:a]join=inputs=2:channel_layout=stereo',
                    str(bgm),
                ],
                check=True,
            )
            (root / 'beats.json').write_text(
                json.dumps([{'name': 'landing', 'ms': 0}, {'name': 'end', 'ms': 2500}]), encoding='utf-8'
            )
            script = root / 'narration.txt'
            script.write_text('landing | 100 | A visible result.\n', encoding='utf-8')
            speaker = root / 'fake_speaker.py'
            speaker.write_text(
                textwrap.dedent(
                    '''
                    import json, sys, wave
                    from pathlib import Path

                    marker = Path(sys.argv[-1]).parent / 'speaker-invocations.txt'
                    if len(sys.argv) == 4 and sys.argv[1] == '--batch':
                        lines = json.loads(Path(sys.argv[2]).read_text())
                        out = Path(sys.argv[3])
                        out.mkdir(parents=True, exist_ok=True)
                        marker.write_text('batch\\n')
                        for index, _line in enumerate(lines):
                            with wave.open(str(out / f'{index}.wav'), 'wb') as wav:
                                wav.setnchannels(1)
                                wav.setsampwidth(2)
                                wav.setframerate(24000)
                                wav.writeframes(b'\\0\\0' * 24000)
                        raise SystemExit(0)
                    marker.write_text(marker.read_text() + 'single\\n' if marker.exists() else 'single\\n')
                    raise SystemExit(1)
                    '''
                ).lstrip(),
                encoding='utf-8',
            )
            output = root / 'demo.mp4'
            env = {
                **os.environ,
                'DEMO_DIR': str(root),
                'DEMO_SOURCE': str(source),
                'DEMO_SCRIPT': str(script),
                'DEMO_SPEAK': str(speaker),
                'DEMO_PYTHON': sys.executable,
                'DEMO_OUT': str(output),
                'DEMO_BGM': str(bgm),
                'DEMO_MIN_DURATION': '0',
                'DEMO_MAX_DURATION': '10',
            }

            result = subprocess.run(
                ['bash', str(DEMO_DIR / 'narrate.sh')], capture_output=True, text=True, env=env, timeout=60
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / 'speaker-invocations.txt').read_text(), 'batch\n')
            self.assertTrue(output.is_file())
            channels = subprocess.run(
                [
                    'ffprobe',
                    '-v',
                    'error',
                    '-select_streams',
                    'a:0',
                    '-show_entries',
                    'stream=channels,duration',
                    '-of',
                    'json',
                    str(output),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            audio = json.loads(channels.stdout)['streams'][0]
            self.assertEqual(audio['channels'], 2)
            self.assertGreaterEqual(float(audio['duration']), 2.9)


if __name__ == '__main__':
    unittest.main()
