import { nanoid } from 'nanoid';

/**
 * Generate a cryptographically random room ID.
 * 21 characters using nanoid's URL-safe alphabet (A-Za-z0-9_-).
 * This gives 126 bits of entropy — more combinations than atoms in the observable universe.
 */
export function generateRoomId(): string {
  return nanoid(21);
}
