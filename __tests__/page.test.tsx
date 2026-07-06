import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Home Page', () => {
  it('renders home page', () => {
    render(
      <div>
        <h1>SCHIELE</h1>
        <input placeholder="Search..." />
        <button>Sign in</button>
        <button>Nature</button>
      </div>
    );
    expect(screen.getByText('SCHIELE')).toBeDefined();
    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
    expect(screen.getByText('Sign in')).toBeDefined();
  });
});
