import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import RSVPForm from '$lib/RSVPForm.svelte';

afterEach(cleanup);

const defaultProps = {
  rsvp: 'going' as const,
  attendeeName: '',
  onSubmit: vi.fn(),
  onNameInput: vi.fn(),
};

describe('RSVPForm', () => {
  it('renders the name input', () => {
    render(RSVPForm, { props: defaultProps });
    expect(screen.getByLabelText(/Your Name/)).toBeInTheDocument();
  });

  it('renders all three status buttons', () => {
    render(RSVPForm, { props: defaultProps });
    expect(screen.getByRole('button', { name: 'Going' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not Going' })).toBeInTheDocument();
  });

  it('marks the initial status button as pressed', () => {
    render(RSVPForm, { props: { ...defaultProps, rsvp: 'going' as const } });
    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Not Going' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks maybe as initially pressed when rsvp="maybe"', () => {
    render(RSVPForm, { props: { ...defaultProps, rsvp: 'maybe' as const } });
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches selection when a different status button is clicked', async () => {
    render(RSVPForm, { props: { ...defaultProps, rsvp: 'going' as const } });
    await fireEvent.click(screen.getByRole('button', { name: 'Maybe' }));
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to Not Going when that button is clicked', async () => {
    render(RSVPForm, { props: { ...defaultProps, rsvp: 'going' as const } });
    await fireEvent.click(screen.getByRole('button', { name: 'Not Going' }));
    expect(screen.getByRole('button', { name: 'Not Going' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the submit button', () => {
    render(RSVPForm, { props: defaultProps });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', async () => {
    const onSubmit = vi.fn();
    render(RSVPForm, { props: { ...defaultProps, onSubmit } });
    // Unnamed forms don't get role="form"; fire submit directly on the element
    await fireEvent.submit(document.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('disables the submit button when disabled prop is true', () => {
    render(RSVPForm, { props: { ...defaultProps, disabled: true } });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('enables the submit button when disabled prop is false', () => {
    render(RSVPForm, { props: { ...defaultProps, disabled: false } });
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('shows the name input as required', () => {
    render(RSVPForm, { props: defaultProps });
    expect(screen.getByLabelText(/Your Name/)).toBeRequired();
  });

  it('reflects attendeeName in the name input', () => {
    render(RSVPForm, { props: { ...defaultProps, attendeeName: 'Bob' } });
    expect(screen.getByLabelText(/Your Name/)).toHaveValue('Bob');
  });
});
