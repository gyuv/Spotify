import { describe, expect, it } from 'vitest';
import { cleanTitle, lineAt, parseLRC } from '../lib/lyrics';

describe('parseLRC', () => {
  it('parses mm:ss.xx stamps and sorts lines', () => {
    const lines = parseLRC('[00:12.50]second\n[00:01.00]first\n[ar:Someone]\n[01:02.345]third');
    expect(lines).toEqual([
      { t: 1000, text: 'first' },
      { t: 12500, text: 'second' },
      { t: 62345, text: 'third' },
    ]);
  });

  it('expands lines with several timestamps', () => {
    const lines = parseLRC('[00:10.00][00:30.00]chorus');
    expect(lines.map((l) => l.t)).toEqual([10000, 30000]);
    expect(lines.every((l) => l.text === 'chorus')).toBe(true);
  });

  it('applies the [offset] tag (positive = earlier) without going negative', () => {
    expect(parseLRC('[offset:+500]\n[00:02.00]a\n[00:00.20]b').map((l) => l.t)).toEqual([0, 1500]);
  });

  it('keeps blank timed lines (instrumental gaps) and ignores untimed text', () => {
    const lines = parseLRC('hello\n[00:05.00]\n[00:20.00]back');
    expect(lines).toEqual([
      { t: 5000, text: '' },
      { t: 20000, text: 'back' },
    ]);
  });

  it('accepts single-digit fractions and colon separators', () => {
    expect(parseLRC('[00:01.5]x\n[00:02:25]y').map((l) => l.t)).toEqual([1500, 2250]);
  });
});

describe('lineAt', () => {
  const lines = parseLRC('[00:01.00]a\n[00:05.00]b\n[00:09.00]c');
  it('returns -1 before the first line', () => expect(lineAt(lines, 500)).toBe(-1));
  it('finds the current line', () => {
    expect(lineAt(lines, 1000)).toBe(0);
    expect(lineAt(lines, 4999)).toBe(0);
    expect(lineAt(lines, 5000)).toBe(1);
    expect(lineAt(lines, 99999)).toBe(2);
  });
  it('handles an empty list', () => expect(lineAt([], 1000)).toBe(-1));
});

describe('cleanTitle', () => {
  it('strips remaster and feature suffixes', () => {
    expect(cleanTitle('Here Comes The Sun - Remastered 2009')).toBe('Here Comes The Sun');
    expect(cleanTitle('Song (feat. Someone)')).toBe('Song');
    expect(cleanTitle('Song [Live]')).toBe('Song');
    expect(cleanTitle('Plain')).toBe('Plain');
  });
});
