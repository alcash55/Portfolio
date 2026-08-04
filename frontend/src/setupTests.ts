import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure every test starts from a clean DOM so assertions can't leak
// (e.g. a Snackbar left open by one test being "found" by the next).
afterEach(() => {
  cleanup();
});
