import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('UI Components', () => {
  it('button click works', () => {
    let clicked = false;
    render(<button onClick={() => { clicked = true; }}>Click me</button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(clicked).toBe(true);
  });

  it('input handles change', () => {
    render(<input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    fireEvent.change(input, { target: { value: 'test' } });
    expect((input as HTMLInputElement).value).toBe('test');
  });

  it('link has correct href', () => {
    render(<a href="/test">Link</a>);
    expect(screen.getByText('Link').getAttribute('href')).toBe('/test');
  });

  it('image has alt text', () => {
    render(<img src="test.jpg" alt="Test image" />);
    expect(screen.getByAltText('Test image')).toBeDefined();
  });

  it('div has class', () => {
    render(<div className="test-class">Div</div>);
    expect(screen.getByText('Div').className).toBe('test-class');
  });
});
