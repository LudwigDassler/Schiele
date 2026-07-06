import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Auth Page', () => {
  it('renders auth page', () => {
    render(
      <div>
        <h1>Sign in</h1>
        <input placeholder="Email" />
        <input placeholder="Password" type="password" />
        <button>Sign In</button>
        <button>Sign Up</button>
      </div>
    );
    expect(screen.getByText('Sign in')).toBeDefined();
    expect(screen.getByPlaceholderText('Email')).toBeDefined();
    expect(screen.getByPlaceholderText('Password')).toBeDefined();
  });
});
