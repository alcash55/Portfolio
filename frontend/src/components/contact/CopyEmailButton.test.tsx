import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyEmailButton } from './CopyEmailButton';

function setup() {
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  render(<CopyEmailButton address="a@b.co" />);
  return { user };
}

describe('CopyEmailButton', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts as "Copy email address"', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Copy email address' })).toBeInTheDocument();
  });

  it('copies the address, says so, and goes back after 2 seconds', async () => {
    const { user } = setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByRole('button', { name: 'Copy email address' }));

    expect(write).toHaveBeenCalledWith('a@b.co');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Email address copied to clipboard.');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole('button', { name: 'Copy email address' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('tells the visitor to select the address when the browser refuses', async () => {
    const { user } = setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await user.click(screen.getByRole('button', { name: 'Copy email address' }));

    expect(
      await screen.findByRole('button', { name: "Couldn't copy. Select the address instead." }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      "Couldn't copy. Select the address instead.",
    );
  });
});
