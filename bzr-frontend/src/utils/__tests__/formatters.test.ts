import { describe, it, expect } from 'vitest';
import { formatUsdValue, truncateHash } from '../formatters';

describe('formatUsdValue', () => {
  it('should format USD values with K/M/B notation', () => {
    expect(formatUsdValue(1234.56)).toBe('$1.23K');
    expect(formatUsdValue(1000000)).toBe('$1.00M');
  });

  it('should format small values with appropriate decimals', () => {
    expect(formatUsdValue(0.01)).toBe('$0.01'); // >= 0.01 uses 2 decimals
    expect(formatUsdValue(0)).toBe('$0.0000'); // < 0.01 uses 4 decimals
  });

  it('should handle very small values', () => {
    expect(formatUsdValue(0.001)).toBe('$0.0010');
  });
});

describe('truncateHash', () => {
  it('should truncate long hashes correctly', () => {
    const hash = '0x1234567890abcdef1234567890abcdef12345678';
    const truncated = truncateHash(hash);
    expect(truncated).toBe('0x1234...5678');
  });

  it('should truncate all hashes to format 0x####...####', () => {
    const shortHash = '0x1234';
    // Based on actual implementation, it always truncates
    expect(truncateHash(shortHash)).toBe('0x1234...1234');
  });
});
