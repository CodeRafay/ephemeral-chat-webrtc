import { customAlphabet } from 'nanoid';
import { LIMITS, ROOM_CODE_REGEX } from './constants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateRoomCode = customAlphabet(ALPHABET, LIMITS.ROOM_CODE_LENGTH);

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
