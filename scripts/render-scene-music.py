"""Render the town's original, sample-free ambient scores (NumPy + afconvert).

Development-only tool. The family server needs neither dependency: it serves
the committed M4A files. Melodies, voicings and synthesis are defined here.
"""
from pathlib import Path
import json
import subprocess
import tempfile
import wave
import numpy as np

RATE = 32000
OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'


def render(scene, bpm, chords, melody, style):
    beat = 60 / bpm
    bars = 24
    length = round(bars * 4 * beat * RATE)
    mix = np.zeros((length, 2), dtype=np.float64)

    def note(midi, at, beats, amp, voice='bell', pan=0):
        duration = beats * beat
        t = np.arange(round((duration + 2.5) * RATE)) / RATE
        f = 440 * 2 ** ((midi - 69) / 12)
        phase = 2 * np.pi * f * t
        if voice == 'pad':
            env = (1 - np.exp(-t / .65)) * np.minimum(1, np.maximum(0, (duration + 1.8 - t) / 2))
            tone = (np.sin(phase) + .24 * np.sin(phase * 2 + .3) + .12 * np.sin(phase * .998)) * env
        elif voice == 'pluck':
            tone = sum(a * np.sin(phase * h) * np.exp(-t * d) for h, a, d in [(1, 1, 1.6), (2, .3, 3), (3, .1, 5)])
            tone *= (1 - np.exp(-t / .009)) * np.minimum(1, np.maximum(0, (duration + 2 - t) / .5))
        elif voice == 'pulse':
            tone = (np.sin(phase) + .2 * np.sin(phase * 2)) * (1 - np.exp(-t / .018)) * np.exp(-t * 3.8)
        else:
            tone = (np.sin(phase) * np.exp(-t / 1.6) + .16 * np.sin(phase * 2.002) * np.exp(-t / .6))
            tone *= (1 - np.exp(-t / .012))
        tone *= amp
        stereo = tone[:, None] * np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
        start = round(at * beat * RATE)
        # Wrap tails into the beginning: the composition itself is cyclic.
        for delay, gain, swap in [(0, 1, False), (.19, .13, True), (.37, .09, False), (.61, .06, True)]:
            indices = (start + round(delay * RATE) + np.arange(len(t))) % length
            mix[indices] += stereo[:, ::-1] * gain if swap else stereo * gain

    for bar in range(bars):
        chord = chords[(bar // 2) % len(chords)]
        at = bar * 4
        if bar % 2 == 0:
            for j, pitch in enumerate(chord):
                note(pitch, at, 7.5, .027, 'pad', (j - 1.5) * .25)
            note(chord[0] - 12, at, 5, .038, 'pad', 0)
        if style == 'town':
            for k, step in enumerate([0, 2, 1, 3]):
                note(chord[step] + 12, at + k + .03 * (k % 2), 1.3, .060 if k == 0 else .039, 'pluck', -.25)
        elif style == 'workshop':
            for k, step in enumerate([0, 2, 3, 1, 2, 3]):
                note(chord[step] + 12, at + k * .5, .7, .034, 'pulse', (-1) ** k * .35)
            for k in [0, 2]:
                note(chord[0] - 12, at + k, .8, .040, 'pulse')
        else:
            note(chord[2] + 12, at + 1.5, 3, .030, 'bell', -.4)
        # Three eight-bar phrases; the final phrase leaves room to breathe.
        phrase = bar // 8
        for offset, pitch in melody[bar % 8]:
            if phrase == 2 and bar % 2: continue
            note(pitch + (12 if phrase == 1 and style == 'greenhouse' else 0), at + offset, 2.7, .060 if style == 'town' else .044, 'bell' if style != 'workshop' else 'pluck', .25)

    # Consistent quiet mastering, no hard clipping and no silence at loop seam.
    mix *= min(.8 / np.max(np.abs(mix)), .10 / np.sqrt(np.mean(mix ** 2)))
    pcm = (mix * 32767).astype('<i2')
    with tempfile.TemporaryDirectory() as temp:
        wav = Path(temp) / 'score.wav'
        with wave.open(str(wav), 'wb') as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(RATE)
            output.writeframes(pcm.tobytes())
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '128000', '-q', '127', str(wav), str(OUT / f'{scene}-v1.m4a')], check=True)
    return {'scene': scene, 'bpm': bpm, 'seconds': round(length / RATE, 3), 'peak': round(float(np.max(np.abs(mix))), 4), 'rms': round(float(np.sqrt(np.mean(mix ** 2))), 4), 'seam_delta': round(float(np.max(np.abs(mix[-1] - mix[0]))), 5)}


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    scores = [
        render('town', 78, [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 57, 62]], [[(0, 76), (2, 79)], [(1, 74), (3, 72)], [(0, 76), (2.5, 72)], [(1, 71)], [(0, 69), (2, 72)], [(1, 76), (3, 74)], [(0, 71), (2, 74)], [(0, 67)]], 'town'),
        render('greenhouse', 64, [[50, 57, 60, 64], [46, 53, 57, 60], [48, 55, 60, 64], [45, 52, 55, 62]], [[(1, 77)], [(2, 76)], [(0, 72)], [(2, 69)], [(1, 76)], [(2.5, 79)], [(0, 74)], [(1, 69)]], 'greenhouse'),
        render('workshop', 88, [[40, 47, 54, 59], [48, 55, 59, 62], [43, 50, 54, 59], [50, 57, 61, 64]], [[(0, 71), (2, 78)], [(1, 74)], [(0, 76), (2.5, 74)], [(1, 71)], [(0, 74), (3, 78)], [(1, 71)], [(0, 73), (2, 76)], [(1, 69)]], 'workshop'),
    ]
    (OUT / 'score-info.json').write_text(json.dumps(scores, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(scores, indent=2))
