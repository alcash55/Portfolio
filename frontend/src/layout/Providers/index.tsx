import type { JSX } from 'react';
import { ThemeProvider } from '../Theme';
import AppShellProvider from '../../components/AppShell/AppShell';
interface ProvidersProps {
  children: JSX.Element;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AppShellProvider>{children}</AppShellProvider>
    </ThemeProvider>
  );
}
