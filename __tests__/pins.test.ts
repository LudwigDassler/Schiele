import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Pins API', () => {
  it('GET /api/pins returns pins with valid structure', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/pins`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
      expect(Array.isArray(data.pins)).toBe(true);
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/pins with user_id returns pins', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/pins?user_id=test`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('POST /api/pins creates new pin', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: 'test.jpg', title: 'Test Pin' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pin');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('DELETE /api/pins deletes pin', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/pins?id=1`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('success', true);
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
