import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import Header from '$lib/Header.svelte';

afterEach(cleanup);

function renderHeader() {
  const setMenuOpen = vi.fn();
  const result = render(Header, {
    context: new Map([['setMenuOpen', setMenuOpen]]),
  });
  return { ...result, setMenuOpen };
}

describe('Header', () => {
  it('renders the site logo link', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Event RSVP Tool' })).toBeInTheDocument();
  });

  it('logo link points to home page', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Event RSVP Tool' })).toHaveAttribute('href', '/');
  });

  it('renders the hamburger menu button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('sidebar is not visible initially', () => {
    renderHeader();
    expect(screen.queryByRole('navigation', { name: 'Sidebar navigation' })).not.toBeInTheDocument();
  });

  it('opens the sidebar when the menu button is clicked', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('navigation', { name: 'Sidebar navigation' })).toBeInTheDocument();
  });

  it('sidebar contains expected navigation links', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const nav = screen.getByRole('navigation', { name: 'Sidebar navigation' });
    expect(nav).toHaveTextContent('Home');
    expect(nav).toHaveTextContent('Events');
    expect(nav).toHaveTextContent('My RSVPs');
    expect(nav).toHaveTextContent('Create Event');
    expect(nav).toHaveTextContent('Admin Login');
  });

  it('closes the sidebar when the close button is clicked', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('navigation', { name: 'Sidebar navigation' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('navigation', { name: 'Sidebar navigation' })).not.toBeInTheDocument();
  });

  it('closes the sidebar when the backdrop is clicked', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const backdrop = document.querySelector('[aria-hidden="true"]')!;
    await fireEvent.click(backdrop);
    expect(screen.queryByRole('navigation', { name: 'Sidebar navigation' })).not.toBeInTheDocument();
  });

  it('closes the sidebar on Escape key press', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('navigation', { name: 'Sidebar navigation' })).toBeInTheDocument();

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Sidebar navigation' })).not.toBeInTheDocument();
  });

  it('calls setMenuOpen(true) when sidebar opens', async () => {
    const { setMenuOpen } = renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(setMenuOpen).toHaveBeenCalledWith(true);
  });

  it('calls setMenuOpen(false) when sidebar closes', async () => {
    const { setMenuOpen } = renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(setMenuOpen).toHaveBeenCalledWith(false);
  });

  it('moves focus to the close button when the sidebar opens', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
    });
  });

  it('closes sidebar when a navigation link is clicked', async () => {
    renderHeader();
    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const homeLink = screen.getByRole('navigation', { name: 'Sidebar navigation' })
      .querySelector('a[href="/"]')!;
    await fireEvent.click(homeLink);
    expect(screen.queryByRole('navigation', { name: 'Sidebar navigation' })).not.toBeInTheDocument();
  });
});
