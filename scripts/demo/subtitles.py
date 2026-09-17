"""Builds the burned-in subtitle track from the same lines.json the narration
uses, so the words on screen and the words being spoken cannot drift apart.

Timing comes from two measured things and nothing hand-tuned: the beat offset
record.mjs recorded, and the real duration of the wav the selected TTS produced
for that line. A subtitle that outlives its audio is worse than none -- it
asserts a claim the video is no longer making.

Long lines are split into readable cards rather than shrunk. Two lines of 36
characters is the broadcast convention and it is a convention because it is
what a person can read in one glance while also watching a picture.
"""

import json
import sys
import wave
from pathlib import Path

MAX_CHARS = 36
MAX_LINES = 2
MIN_CARD_MS = 900


def wav_ms(path):
    with wave.open(str(path)) as w:
        return int(1000 * w.getnframes() / w.getframerate())


def wrap(text):
    """Split into lines of similar length, never mid-word.

    Two things depend on this and neither is cosmetic. A greedy wrap strands
    single words -- "...the post it came" / "from." -- and a one-word card is a
    jolt landing on the sentence where the product makes its claim. And because
    the burned-in style draws a box per line, uneven lines produce a stepped
    ragged edge; lines of similar width read as one block.

    Chooses the split minimising the longest line, over the fewest lines that fit.
    """
    words = text.split()
    if not words:
        return []

    def pack(n):
        """Best split of words into exactly n lines, minimising the longest."""
        best = None

        # Only n-1 cut positions; the script is short enough to brute force.
        def walk(idx, made, cur, longest):
            nonlocal best
            if best is not None and longest >= best[0]:
                return
            if made == n - 1:
                tail = ' '.join(words[idx:])
                cand = max(longest, len(tail))
                if cand <= MAX_CHARS and (best is None or cand < best[0]):
                    best = (cand, cur + [tail])
                return
            for j in range(idx + 1, len(words)):
                line = ' '.join(words[idx:j])
                if len(line) > MAX_CHARS:
                    break
                walk(j, made + 1, cur + [line], max(longest, len(line)))

        walk(0, 0, [], 0)
        return best

    for n in range(1, len(words) + 1):
        got = pack(n)
        if got:
            return got[1]
    return [' '.join(words)]


def cards(text):
    """Group wrapped lines into cards of at most MAX_LINES."""
    lines = wrap(text)
    if not lines:
        return []
    # Put the shorter card first. A trailing one-line card often severs the
    # sentence's proof phrase (especially a spoken amount) from its setup.
    first = len(lines) % MAX_LINES or MAX_LINES
    groups = [lines[:first]]
    groups.extend(lines[i : i + MAX_LINES] for i in range(first, len(lines), MAX_LINES))
    return ['\n'.join(group) for group in groups]


def ts(ms):
    ms = max(0, int(ms))
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def build(demo_dir):
    d = Path(demo_dir)
    lines = json.loads((d / 'lines.json').read_text())
    spans = []
    for i, line in enumerate(lines):
        seg = d / 'seg' / f'{i}.wav'
        if not seg.exists():
            print(f'  no audio for line {i}, subtitle dropped: {line["text"][:40]}...', file=sys.stderr)
            continue
        total = wav_ms(seg)
        chunks = cards(line['text'])
        # Split the spoken duration by character count. Even splitting drifts on
        # a long card followed by a short one, and the drift is visible.
        weights = [len(c) for c in chunks]
        span = sum(weights) or 1
        cursor = line['ms']
        for chunk, weight in zip(chunks, weights, strict=True):
            dur = max(MIN_CARD_MS, int(total * weight / span))
            spans.append([cursor, cursor + dur, chunk])
            cursor += dur

    # A line whose audio outruns the next line's beat leaves two cards on screen
    # at once. That is not a near-miss, it is two different claims stacked on the
    # same frame. Truncate rather than reorder: the beat is measured from the
    # picture and the picture is what the words have to match.
    spans.sort(key=lambda s: s[0])
    for a, b in zip(spans, spans[1:], strict=False):
        if a[1] > b[0]:
            a[1] = b[0]
    spans = [s for s in spans if s[1] - s[0] >= 200]

    out = [f'{n}\n{ts(a)} --> {ts(b)}\n{text}\n' for n, (a, b, text) in enumerate(spans, 1)]
    n = len(out)
    path = d / 'narration.srt'
    path.write_text('\n'.join(out), encoding='utf-8')
    print(f'  {n} subtitle cards from {len(lines)} narration lines -> {path.name}')
    return path


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else '.')
