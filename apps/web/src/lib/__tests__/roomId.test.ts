import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../roomId';

describe('generateRoomCode', () => {
  it('returns 8 uppercase alphanumeric characters', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateRoomCode));
    expect(codes.size).toBe(100);
  });
});

describe('isValidRoomCode', () => {
  it('accepts valid 8-char uppercase alphanumeric', () => {
    expect(isValidRoomCode('X7K9P2AB')).toBe(true);
  });
  it('accepts 6-char minimum', () => {
    expect(isValidRoomCode('ABC123')).toBe(true);
  });
  it('accepts 10-char maximum', () => {
    expect(isValidRoomCode('ABCDE12345')).toBe(true);
  });
  it('rejects lowercase', () => {
    expect(isValidRoomCode('x7k9p2ab')).toBe(false);
  });
  it('rejects special chars', () => {
    expect(isValidRoomCode('X7K9P2!')).toBe(false);
  });
  it('rejects too short', () => {
    expect(isValidRoomCode('ABC12')).toBe(false);
  });
  it('rejects too long', () => {
    expect(isValidRoomCode('ABCDE123456')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidRoomCode('')).toBe(false);
  });
});

describe('normalizeRoomCode', () => {
  it('uppercases input', () => {
    expect(normalizeRoomCode('x7k9p2ab')).toBe('X7K9P2AB');
  });
  it('strips spaces', () => {
    expect(normalizeRoomCode(' X7K 9P2AB ')).toBe('X7K9P2AB');
  });
  it('strips special characters', () => {
    expect(normalizeRoomCode('X7K-9P2AB')).toBe('X7K9P2AB');
  });
});
