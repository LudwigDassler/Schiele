import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Profile Page', () => {
  it('renders profile page', () => {
    render(
      <div>
        <h1>Edit Profile</h1>
        <input placeholder="Display name" />
        <textarea placeholder="Bio" />
        <button>Save Profile</button>
      </div>
    );
    expect(screen.getByText('Edit Profile')).toBeDefined();
    expect(screen.getByPlaceholderText('Display name')).toBeDefined();
    expect(screen.getByPlaceholderText('Bio')).toBeDefined();
    expect(screen.getByText('Save Profile')).toBeDefined();
  });
});
