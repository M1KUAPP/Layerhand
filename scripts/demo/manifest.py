"""Resolve beat-keyed narration into a timing manifest with visual boundaries."""

import json
import sys
from pathlib import Path


def build(demo_dir, script_path):
    root = Path(demo_dir)
    script = Path(script_path)
    beats = json.loads((root / 'beats.json').read_text(encoding='utf-8'))
    beat_times = {beat['name']: int(beat['ms']) for beat in beats}
    visual_ends = {
        beat['name']: int(beats[index + 1]['ms']) if index + 1 < len(beats) else None
        for index, beat in enumerate(beats)
    }

    lines = []
    missing = []
    for raw in script.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        name, offset, text = (part.strip() for part in line.split('|', 2))
        if name not in beat_times:
            missing.append(f'beat {name!r} never happened: {text[:50]}')
            continue
        lines.append(
            {
                'beat': name,
                'ms': beat_times[name] + int(offset),
                'visual_end_ms': visual_ends[name],
                'text': text,
            }
        )

    if missing:
        raise ValueError('; '.join(missing))

    lines.sort(key=lambda item: item['ms'])
    (root / 'lines.json').write_text(f'{json.dumps(lines, indent=2, ensure_ascii=False)}\n', encoding='utf-8')
    print(f'  {len(lines)} lines resolved against {len(beats)} beats')
    return lines


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: manifest.py <demo-dir> <narration-script>', file=sys.stderr)
        sys.exit(2)
    try:
        build(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f'  manifest error: {error}', file=sys.stderr)
        sys.exit(1)
