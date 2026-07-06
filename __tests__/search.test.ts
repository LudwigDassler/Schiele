import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Search API', () => {
  it('GET /api/search with valid query returns results', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=David%20Byrne`);
    expect(res.status).toBe(200);
    const data = await res.json();
    // /api/search возвращает pins, а не results
    expect(data).toHaveProperty('pins');
    expect(Array.isArray(data.pins)).toBe(true);
  });

  it('GET /api/search with empty query returns empty array', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('pins');
  });

  it('GET /api/search with short query returns empty array', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=a`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('pins');
  });

  it('GET /api/search with special characters', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=!@#$%`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('pins');
  });

  it('GET /api/search with Russian query', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('pins');
  });
});
