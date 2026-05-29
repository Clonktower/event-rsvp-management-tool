import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import HomePage from '../../routes/+page.svelte';

afterEach(cleanup);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Home page', () => {
  it('renders a link to Create Event', () => {
    render(HomePage);
    expect(screen.getByRole('link', { name: 'Create Event' })).toHaveAttribute('href', '/create-event');
  });

  it('renders a link to View All Events', () => {
    render(HomePage);
    expect(screen.getByRole('link', { name: 'View All Events' })).toHaveAttribute('href', '/events');
  });

  it('renders a link to View My RSVPs', () => {
    render(HomePage);
    expect(screen.getByRole('link', { name: 'View My RSVPs' })).toHaveAttribute('href', '/my/rsvps');
  });

  it('sets the page title', () => {
    render(HomePage);
    // svelte:head title set by the component
    expect(document.title).toBe('Welcome | Event RSVP');
  });

  it('renders the wave emoji', () => {
    render(HomePage);
    expect(document.body).toHaveTextContent('👋');
  });
});
