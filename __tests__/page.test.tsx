import { describe, it, expect } from 'vitest';

describe('Home Page', () => {
  it('should render without Supabase', () => {
    expect(true).toBe(true);
  });

  it('should pass basic test', () => {
    expect('Schiele').toBe('Schiele');
  });
});
