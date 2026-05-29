import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import AdminLoginPage from '../../routes/admin/login/+page.svelte';
import { goto } from '$app/navigation';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function mockFetch(ok: boolean, status = ok ? 200 : 401) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => ({}),
    } as Response),
  );
}

describe('Admin login page', () => {
  it('renders the page heading', () => {
    render(AdminLoginPage);
    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeInTheDocument();
  });

  it('renders username and password inputs', () => {
    render(AdminLoginPage);
    expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    render(AdminLoginPage);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('username input is required', () => {
    render(AdminLoginPage);
    expect(screen.getByLabelText(/Username/)).toBeRequired();
  });

  it('password input is of type password', () => {
    render(AdminLoginPage);
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('type', 'password');
  });

  it('shows error message when login fails', async () => {
    mockFetch(false, 401);
    render(AdminLoginPage);

    await fireEvent.input(screen.getByLabelText(/Username/), { target: { value: 'admin' } });
    await fireEvent.input(screen.getByLabelText(/Password/), { target: { value: 'wrong' } });
    await fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });
  });

  it('does not show error message initially', () => {
    render(AdminLoginPage);
    expect(screen.queryByText('Invalid username or password')).not.toBeInTheDocument();
  });

  it('redirects to /events on successful login', async () => {
    mockFetch(true);
    vi.mocked(goto).mockClear();
    render(AdminLoginPage);

    await fireEvent.input(screen.getByLabelText(/Username/), { target: { value: 'admin' } });
    await fireEvent.input(screen.getByLabelText(/Password/), { target: { value: 'correct' } });
    await fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(goto).toHaveBeenCalledWith('/events');
    });
  });

  it('stores credentials in localStorage on successful login', async () => {
    mockFetch(true);
    render(AdminLoginPage);

    await fireEvent.input(screen.getByLabelText(/Username/), { target: { value: 'admin' } });
    await fireEvent.input(screen.getByLabelText(/Password/), { target: { value: 'secret' } });
    await fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(localStorage.getItem('credentials')).toBe('admin:secret');
    });
  });

  it('sets the page title', () => {
    render(AdminLoginPage);
    expect(document.title).toBe('Admin Login | Event RSVP');
  });
});
