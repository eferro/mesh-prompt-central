import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the auth page', () => {
    window.history.pushState({}, 'Auth page', '/auth')
    render(<App />);
    expect(screen.getByText('PromptMesh')).toBeInTheDocument();
  });
});
