import { describe, it, expect } from 'vitest';
import { config } from '../components/Providers';

describe('Frontend Bootstrap Tests', () => {
  it('Wagmi config restricts network to Avalanche Fuji (43113) only', () => {
    expect(config.chains).toBeDefined();
    expect(config.chains.length).toBe(1);
    expect(config.chains[0].id).toBe(43113);
    expect(config.chains[0].name).toBe('Avalanche Fuji');
  });
});
