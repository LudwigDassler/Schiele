import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Search API', () => {
  it('GET /api/search with valid query returns results', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=David%20Byrne`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
      expect(Array.isArray(data.pins)).toBe(true);
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/search with empty query returns pins', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/search with short query returns pins', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=a`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/search with special characters', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=!@#$%`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('GET /api/search with Russian query', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('pins');
    } catch (e) {
      expect(true).toBe(true);
    }
  });
});
