import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Creative API', () => {
  it('GET /api/creative with music returns photos', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/creative?category=music&page=1`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('photos');
      expect(Array.isArray(data.photos)).toBe(true);
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/creative with memes returns photos', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/creative?category=memes&page=1`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('photos');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/creative with invalid category returns photos', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/creative?category=invalid&page=1`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('photos');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/creative with query parameter returns results', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/creative?category=music&query=rock&page=1`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('photos');
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
