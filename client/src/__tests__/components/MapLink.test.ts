import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import MapLink from '$lib/MapLink.svelte';

afterEach(cleanup);

describe('MapLink', () => {
  it('renders a link with the address as visible text', () => {
    render(MapLink, { props: { address: '123 Main St, Berlin' } });
    expect(screen.getByRole('link', { name: '123 Main St, Berlin' })).toBeInTheDocument();
  });

  it('opens in a new tab', () => {
    render(MapLink, { props: { address: '123 Main St' } });
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  it('has rel=noopener for security', () => {
    render(MapLink, { props: { address: '123 Main St' } });
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener');
  });

  it('uses a Google Maps URL in jsdom environment (non-mobile UA)', () => {
    // jsdom UA does not contain iPad/iPhone/Macintosh/android, so the
    // fallback Google Maps web URL is used.
    render(MapLink, { props: { address: 'Berliner Str. 1, Berlin' } });
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href).toContain('google.com/maps');
    // encodeURIComponent uses %20 for spaces, not +
    expect(href).toContain('Berliner%20Str.%201%2C%20Berlin');
  });

  it('encodes the address into the href', () => {
    render(MapLink, { props: { address: 'Some Place & Venue' } });
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href).toContain(encodeURIComponent('Some Place & Venue'));
  });

  it('uses address as link text even when label prop differs', () => {
    render(MapLink, { props: { address: '10 Downing St', label: 'The Office' } });
    // The displayed text is always the address, label is only used in geo URIs
    expect(screen.getByRole('link', { name: '10 Downing St' })).toBeInTheDocument();
  });
});
