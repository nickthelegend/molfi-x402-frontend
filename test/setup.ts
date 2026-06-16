import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mocking next/font/google or other next assets if needed
vi.mock('next/font/google', () => ({
  Space_Grotesk: () => ({ variable: 'mock-space-grotesk' }),
  Inter: () => ({ variable: 'mock-inter' }),
  JetBrains_Mono: () => ({ variable: 'mock-jetbrains-mono' }),
}));
