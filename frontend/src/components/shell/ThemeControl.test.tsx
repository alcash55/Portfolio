import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { setSystemPrefersDark } from '~/test/system';
import { THEME_STORAGE_KEY } from '~/lib/theme';
import { ThemeControl } from './ThemeControl';

const root = () => document.documentElement;

describe('ThemeControl', () => {
  it('offers Light, Dark and System in a group named Theme, with System pressed by default', () => {
    render(<ThemeControl />);
    const group = screen.getByRole('group', { name: 'Theme' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies and saves the choice when an option is pressed', async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(root()).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('removes the attribute again when System is pressed', async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(root()).toHaveAttribute('data-theme', 'light');
    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(root()).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('shows the saved choice on first render', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<ThemeControl />);
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the compact toggle for the theme it switches to', async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(root()).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(root()).toHaveAttribute('data-theme', 'light');
  });

  it('flips the compact toggle label when the system preference changes under System', () => {
    render(<ThemeControl />);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
    act(() => setSystemPrefersDark(true));
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });
});
