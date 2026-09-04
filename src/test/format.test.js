import { describe, it, expect } from 'vitest';
import {
  cleanTitle,
  extractYear,
  formatTime,
  clamp,
  isTamilNavigationItem,
  watchLinkFor,
  ratingTone,
} from '../lib/format';

describe('cleanTitle', () => {
  it('strips trailing year in parentheses', () => {
    expect(cleanTitle('Leo (2023)')).toBe('Leo');
  });
  it('keeps years that are not trailing', () => {
    expect(cleanTitle('2001: A Space Odyssey')).toBe('2001: A Space Odyssey');
  });
  it('handles empty input', () => {
    expect(cleanTitle()).toBe('');
    expect(cleanTitle('')).toBe('');
  });
});

describe('extractYear', () => {
  it('extracts a 4-digit year', () => {
    expect(extractYear('Jailer (2023)')).toBe('2023');
  });
  it('returns null when absent', () => {
    expect(extractYear('No Year Here')).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats mm:ss under an hour', () => {
    expect(formatTime(125)).toBe('02:05');
  });
  it('formats h:mm:ss over an hour', () => {
    expect(formatTime(3725)).toBe('1:02:05');
  });
  it('handles invalid input', () => {
    expect(formatTime(NaN)).toBe('00:00');
    expect(formatTime(-5)).toBe('00:00');
  });
});

describe('clamp', () => {
  it('clamps within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('isTamilNavigationItem', () => {
  it('flags collection/navigation rows', () => {
    expect(isTamilNavigationItem({ title: 'Tamil 2024 Movies' })).toBe(true);
    expect(isTamilNavigationItem({ title: 'Moviesda Collections' })).toBe(true);
  });
  it('passes real films through', () => {
    expect(isTamilNavigationItem({ title: 'Leo (2023)' })).toBe(false);
  });
});

describe('watchLinkFor', () => {
  it('builds tamil links from .link items', () => {
    const link = watchLinkFor({ link: 'https://x.co/movie/leo', title: 'Leo (2023)' });
    expect(link).toContain('/watch/tamil/');
    expect(link).toContain(encodeURIComponent('https://x.co/movie/leo'));
    expect(link).toContain('title=Leo%20(2023)');
  });
  it('builds english links from .id items', () => {
    expect(watchLinkFor({ id: 'tt123' }, 'series')).toBe('/watch/series/tt123');
    expect(watchLinkFor({ id: 'tt123' }, 'movies')).toBe('/watch/movie/tt123');
  });
  it('builds tamil series links for series kinds', () => {
    const link = watchLinkFor({ link: 'https://x.co/s', title: 'S', kind: 'series' });
    expect(link).toContain('/watch/tamil-series/');
  });
});

describe('ratingTone', () => {
  it('maps rating ranges to tones', () => {
    expect(ratingTone('8.5')).toBe('high');
    expect(ratingTone('7.0')).toBe('mid');
    expect(ratingTone('5.0')).toBe('low');
    expect(ratingTone('n/a')).toBe('low');
  });
});
