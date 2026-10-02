import { describe, expect, it } from 'vitest';
import { fadeInGain, fadeInLength, fadeOutGain, shouldStartFade } from '../lib/crossfade';

const base = {
  crossfadeMs: 6000,
  playing: true,
  repeatTrack: false,
  supportsVolume: true,
  alreadyFaded: false,
  durationMs: 200000,
  positionMs: 195000,
  volume: 70,
};

describe('crossfade curves', () => {
  it('are equal-power and clamped', () => {
    expect(fadeOutGain(0)).toBe(1);
    expect(fadeOutGain(1)).toBeCloseTo(0);
    expect(fadeInGain(0)).toBe(0);
    expect(fadeInGain(1)).toBe(1);
    expect(fadeOutGain(-1)).toBe(1);
    expect(fadeInGain(2)).toBe(1);
    // equal power: out² + in² = 1 at every point
    for (const p of [0.1, 0.33, 0.5, 0.9]) expect(fadeOutGain(p) ** 2 + fadeInGain(p) ** 2).toBeCloseTo(1);
  });

  it('fade-in length is bounded', () => {
    expect(fadeInLength(1000)).toBe(1200);
    expect(fadeInLength(6000)).toBe(3600);
    expect(fadeInLength(12000)).toBe(4000);
  });
});

describe('shouldStartFade', () => {
  it('starts inside the last N seconds', () => expect(shouldStartFade(base)).toBe(true));
  it('waits until the window', () => expect(shouldStartFade({ ...base, positionMs: 150000 })).toBe(false));
  it('skips when off, paused, repeating one track, or volume is unsupported/low', () => {
    expect(shouldStartFade({ ...base, crossfadeMs: 0 })).toBe(false);
    expect(shouldStartFade({ ...base, playing: false })).toBe(false);
    expect(shouldStartFade({ ...base, repeatTrack: true })).toBe(false);
    expect(shouldStartFade({ ...base, supportsVolume: false })).toBe(false);
    expect(shouldStartFade({ ...base, volume: 3 })).toBe(false);
  });
  it('fades each track once and ignores very short tracks or the final 400ms', () => {
    expect(shouldStartFade({ ...base, alreadyFaded: true })).toBe(false);
    expect(shouldStartFade({ ...base, durationMs: 15000, positionMs: 10000 })).toBe(false);
    expect(shouldStartFade({ ...base, positionMs: 199700 })).toBe(false);
  });
});
