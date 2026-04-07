import { describe, it, expect } from 'vitest';
import { MONTH_NAMES, formatMonthLabel, formatDate, formatAmount, formatEnumLabel } from '../../constants';

describe('MONTH_NAMES', () => {
  it('has 12 month abbreviations', () => {
    expect(MONTH_NAMES).toHaveLength(12);
  });

  it('starts with Jan and ends with Dec', () => {
    expect(MONTH_NAMES[0]).toBe('Jan');
    expect(MONTH_NAMES[11]).toBe('Dec');
  });
});

describe('formatMonthLabel', () => {
  it('formats year and month into "Mon YY" format', () => {
    expect(formatMonthLabel(2025, 1)).toBe('Jan 25');
    expect(formatMonthLabel(2026, 12)).toBe('Dec 26');
  });

  it('handles mid-year months', () => {
    expect(formatMonthLabel(2025, 6)).toBe('Jun 25');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2026-04-06');
    // en-US short format: "Apr 6, 2026"
    expect(result).toContain('Apr');
    expect(result).toContain('2026');
  });

  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('\u2014');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('\u2014');
  });

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('\u2014');
  });
});

describe('formatAmount', () => {
  it('formats a number with dollar sign', () => {
    const result = formatAmount(5000);
    expect(result).toContain('$');
    expect(result).toContain('5');
  });

  it('returns em dash for null', () => {
    expect(formatAmount(null)).toBe('\u2014');
  });

  it('returns em dash for undefined', () => {
    expect(formatAmount(undefined)).toBe('\u2014');
  });

  it('handles zero', () => {
    const result = formatAmount(0);
    expect(result).toContain('$');
    expect(result).toContain('0');
  });
});

describe('formatEnumLabel', () => {
  it('converts CamelCase to spaced words', () => {
    expect(formatEnumLabel('WordOfMouth')).toBe('Word Of Mouth');
    expect(formatEnumLabel('SocialMedia')).toBe('Social Media');
    expect(formatEnumLabel('PartnerReferral')).toBe('Partner Referral');
  });

  it('handles special cases with explicit mappings', () => {
    expect(formatEnumLabel('InKind')).toBe('In-Kind');
    expect(formatEnumLabel('MonetaryDonor')).toBe('Monetary Donor');
    expect(formatEnumLabel('SkillsContributor')).toBe('Skills Contributor');
    expect(formatEnumLabel('SocialMediaAdvocate')).toBe('Social Media Advocate');
  });

  it('passes through already-readable values unchanged', () => {
    expect(formatEnumLabel('Monetary')).toBe('Monetary');
    expect(formatEnumLabel('Active')).toBe('Active');
    expect(formatEnumLabel('Time')).toBe('Time');
  });
});
