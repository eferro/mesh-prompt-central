import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { getFullPath } from '../config/app';
import App from '../App';

describe('App', () => {
  it('renders the auth page', () => {
    window.history.pushState({}, 'Auth page', getFullPath('/auth'))
    render(<App />);
    expect(screen.getByText('PromptMesh')).toBeInTheDocument();
  });
});
