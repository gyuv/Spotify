import { describe, expect, it } from 'vitest';
import { toUri } from '../components/GuestApp';

describe('toUri', () => {
  it('parses open.spotify.com links, locales, embeds and query strings', () => {
    expect(toUri('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toBe('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
    expect(toUri('https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT')).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
    expect(toUri('https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3')).toBe('spotify:album:1DFixLWuPkv3KT3TnV35m3');
    expect(toUri('spotify:artist:0OdUWJ0sBjDrqHygGUXeCF')).toBe('spotify:artist:0OdUWJ0sBjDrqHygGUXeCF');
  });
  it('rejects anything else', () => {
    expect(toUri('hello')).toBeNull();
    expect(toUri('https://youtube.com/watch?v=x')).toBeNull();
  });
});
