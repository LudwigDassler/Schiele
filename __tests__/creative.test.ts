import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Creative API', () => {
  it('GET /api/creative with music category returns photos', async () => {
    const res = await fetch(`${BASE_URL}/api/creative?category=music&page=1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('photos');
    expect(Array.isArray(data.photos)).toBe(true);
  });

  it('GET /api/creative with memes category returns photos', async () => {
    const res = await fetch(`${BASE_URL}/api/creative?category=memes&page=1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('photos');
  });
});
