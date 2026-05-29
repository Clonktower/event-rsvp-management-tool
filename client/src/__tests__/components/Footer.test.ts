import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Footer from '$lib/Footer.svelte';

afterEach(cleanup);

describe('Footer', () => {
  it('renders a footer element', () => {
    render(Footer);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('displays creator credits', () => {
    render(Footer);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('Hemang');
    expect(footer).toHaveTextContent('James');
    expect(footer).toHaveTextContent('Miguel');
    expect(footer).toHaveTextContent('Teppo');
  });

  it('contains a heart symbol', () => {
    render(Footer);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('♥');
  });
});
