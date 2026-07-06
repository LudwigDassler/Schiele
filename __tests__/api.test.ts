import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('API Tests', () => {
  it('GET /api/photos returns photos', async () => {
    const res = await fetch(`${BASE_URL}/api/photos?category=All&page=1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('photos');
    expect(Array.isArray(data.photos)).toBe(true);
  });

  it('GET /api/photos with query returns results', async () => {
    const res = await fetch(`${BASE_URL}/api/photos?query=David%20Byrne&category=All&page=1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.photos.length).toBeGreaterThan(0);
  });

  it('GET /api/search returns results', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=David%20Byrne`);
    expect(res.status).toBe(200);
    const data = await res.json();
    // /api/search возвращает pins, а не results
    expect(data).toHaveProperty('pins');
    expect(Array.isArray(data.pins)).toBe(true);
  });
});
