"""Prevent narration collisions and reject speech that crosses a visual beat.

A beat offset says when a moment happens on screen. It says nothing about how
long the line describing it takes to read, and `narrate.sh` mixed every segment
at its beat with no check between them -- so a line longer than the gap to the
next beat played *underneath* it. Two of six lines did that in the launch cut,
and the overlap is inaudible to every mechanical check we run: level, clipping,
silence and dynamics are all normal when two voices are talking at once.

Beats stay authoritative for the EARLIEST a line may start. A line may move only
far enough to clear the one before it; if that makes it outlive the visual it
describes, the render fails and the capture must be retimed.
"""

import json
import subprocess
import sys
from pathlib import Path

GAP_MS = 260


def duration_ms(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True,
        text=True,
    ).stdout.strip()
    return round(float(out) * 1000) if out else 0


def deconflict(lines, durations, gap_ms=GAP_MS):
    """Push starts later so no line is still speaking when the next begins.

    Pure so it can be tested without synthesising audio. Returns the number of
    lines moved; mutates `lines` in place, which is what the caller writes back.
    """
    prev_end = None
    shifted = 0
    for i, line in enumerate(lines):
        dur = durations[i]
        line['dur_ms'] = dur
        want = line['ms']
        if prev_end is not None and want < prev_end + gap_ms:
            line['ms'] = prev_end + gap_ms
            shifted += 1
            print(f'  line {i} pushed {line["ms"] - want}ms later to clear the one before it')
        prev_end = line['ms'] + dur
    return shifted, prev_end


def main(d):
    d = Path(d)
    lines = json.loads((d / 'lines.json').read_text())
    durations = [duration_ms(d / 'seg' / f'{i}.wav') for i in range(len(lines))]
    shifted, prev_end = deconflict(lines, durations)
    (d / 'lines.json').write_text(f'{json.dumps(lines, indent=2, ensure_ascii=False)}\n')
    overlaps = sum(1 for a, b in zip(lines, lines[1:], strict=False) if a['ms'] + a['dur_ms'] > b['ms'])
    print(f'  {len(lines)} lines, {shifted} pushed later, {overlaps} overlapping')
    if overlaps:
        print('  OVERLAP REMAINS -- narration would talk over itself', file=sys.stderr)
        return 1
    visual_overruns = [
        (index, line)
        for index, line in enumerate(lines)
        if line.get('visual_end_ms') is not None and line['ms'] + line['dur_ms'] > line['visual_end_ms']
    ]
    for index, line in visual_overruns:
        overrun = line['ms'] + line['dur_ms'] - line['visual_end_ms']
        print(
            f'  VISUAL OVERRUN: line {index} ({line.get("beat", "unknown")}) runs {overrun}ms into the next beat',
            file=sys.stderr,
        )
    if visual_overruns:
        return 1
    print(f'  narration ends at {prev_end}ms')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
