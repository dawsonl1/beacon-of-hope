import { describe, it, expect } from 'vitest';
import {
  CASE_STATUSES,
  RISK_LEVELS,
  SUPPORTER_TYPES,
  SUPPORTER_STATUSES,
  DONATION_TYPES,
  VISIT_TYPES,
  COOPERATION_LEVELS,
  SESSION_TYPES,
  REINTEGRATION_TYPES,
  REINTEGRATION_STATUSES,
  ACQUISITION_CHANNELS,
} from '../../domain';

describe('Domain constants', () => {
  it('CASE_STATUSES contains expected values', () => {
    expect(CASE_STATUSES).toContain('Active');
    expect(CASE_STATUSES).toContain('Closed');
    expect(CASE_STATUSES).toContain('Discharged');
    expect(CASE_STATUSES).toHaveLength(3);
  });

  it('RISK_LEVELS contains expected values in order', () => {
    expect([...RISK_LEVELS]).toEqual(['Critical', 'High', 'Medium', 'Low']);
  });

  it('SUPPORTER_TYPES contains all types', () => {
    expect(SUPPORTER_TYPES).toContain('MonetaryDonor');
    expect(SUPPORTER_TYPES).toContain('Volunteer');
    expect(SUPPORTER_TYPES).toContain('SkillsContributor');
    expect(SUPPORTER_TYPES).toContain('SocialMediaAdvocate');
    expect(SUPPORTER_TYPES).toHaveLength(4);
  });

  it('SUPPORTER_STATUSES contains expected values', () => {
    expect(SUPPORTER_STATUSES).toContain('Active');
    expect(SUPPORTER_STATUSES).toContain('Inactive');
    expect(SUPPORTER_STATUSES).toContain('Lapsed');
    expect(SUPPORTER_STATUSES).toContain('Prospective');
    expect(SUPPORTER_STATUSES).toHaveLength(4);
  });

  it('DONATION_TYPES contains expected values', () => {
    expect(DONATION_TYPES).toContain('Monetary');
    expect(DONATION_TYPES).toContain('InKind');
    expect(DONATION_TYPES).toContain('Time');
    expect(DONATION_TYPES).toContain('Skills');
    expect(DONATION_TYPES).toContain('SocialMedia');
    expect(DONATION_TYPES).toHaveLength(5);
  });

  it('VISIT_TYPES contains expected values', () => {
    expect(VISIT_TYPES).toHaveLength(5);
    expect(VISIT_TYPES).toContain('Initial Assessment');
    expect(VISIT_TYPES).toContain('Emergency');
  });

  it('COOPERATION_LEVELS contains expected values', () => {
    expect(COOPERATION_LEVELS).toHaveLength(4);
    expect(COOPERATION_LEVELS).toContain('Cooperative');
    expect(COOPERATION_LEVELS).toContain('Hostile');
  });

  it('SESSION_TYPES contains expected values', () => {
    expect(SESSION_TYPES).toHaveLength(7);
    expect(SESSION_TYPES).toContain('Individual');
    expect(SESSION_TYPES).toContain('Crisis');
  });

  it('REINTEGRATION_TYPES contains expected values', () => {
    expect(REINTEGRATION_TYPES).toHaveLength(4);
    expect(REINTEGRATION_TYPES).toContain('Family Reunification');
    expect(REINTEGRATION_TYPES).toContain('Foster Care');
  });

  it('REINTEGRATION_STATUSES contains expected values', () => {
    expect(REINTEGRATION_STATUSES).toHaveLength(4);
    expect(REINTEGRATION_STATUSES).toContain('Not Started');
    expect(REINTEGRATION_STATUSES).toContain('Completed');
  });

  it('ACQUISITION_CHANNELS contains expected values', () => {
    expect(ACQUISITION_CHANNELS).toHaveLength(7);
    expect(ACQUISITION_CHANNELS).toContain('SocialMedia');
    expect(ACQUISITION_CHANNELS).toContain('Direct');
  });
});
