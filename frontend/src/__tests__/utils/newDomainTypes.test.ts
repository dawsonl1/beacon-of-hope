import { describe, it, expect } from 'vitest';
import {
  TASK_TYPES,
  TASK_STATUSES,
  EVENT_TYPES,
  EVENT_STATUSES,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
} from '../../domain';

describe('New Domain Types', () => {
  it('TASK_TYPES has expected values', () => {
    expect(TASK_TYPES).toContain('ScheduleDoctor');
    expect(TASK_TYPES).toContain('ScheduleDentist');
    expect(TASK_TYPES).toContain('UpdateEducation');
    expect(TASK_TYPES).toContain('InputHealthRecords');
    expect(TASK_TYPES).toContain('IncidentFollowUp');
    expect(TASK_TYPES).toContain('Manual');
    expect(TASK_TYPES.length).toBe(9);
  });

  it('TASK_STATUSES has expected values', () => {
    expect(TASK_STATUSES).toContain('Pending');
    expect(TASK_STATUSES).toContain('Snoozed');
    expect(TASK_STATUSES).toContain('Completed');
    expect(TASK_STATUSES).toContain('Dismissed');
    expect(TASK_STATUSES.length).toBe(4);
  });

  it('EVENT_TYPES has expected values', () => {
    expect(EVENT_TYPES).toContain('Counseling');
    expect(EVENT_TYPES).toContain('DoctorApt');
    expect(EVENT_TYPES).toContain('DentistApt');
    expect(EVENT_TYPES).toContain('HomeVisit');
    expect(EVENT_TYPES).toContain('CaseConference');
    expect(EVENT_TYPES).toContain('GroupTherapy');
    expect(EVENT_TYPES).toContain('Other');
    expect(EVENT_TYPES.length).toBe(9);
  });

  it('EVENT_STATUSES has expected values', () => {
    expect(EVENT_STATUSES).toContain('Scheduled');
    expect(EVENT_STATUSES).toContain('Completed');
    expect(EVENT_STATUSES).toContain('Cancelled');
    expect(EVENT_STATUSES.length).toBe(3);
  });

  it('INCIDENT_TYPES has expected values', () => {
    expect(INCIDENT_TYPES).toContain('Runaway');
    expect(INCIDENT_TYPES).toContain('SelfHarm');
    expect(INCIDENT_TYPES).toContain('Behavioral');
    expect(INCIDENT_TYPES).toContain('Security');
    expect(INCIDENT_TYPES).toContain('Medical');
    expect(INCIDENT_TYPES).toContain('Other');
    expect(INCIDENT_TYPES.length).toBe(6);
  });

  it('SEVERITY_LEVELS has expected values', () => {
    expect(SEVERITY_LEVELS).toContain('Critical');
    expect(SEVERITY_LEVELS).toContain('High');
    expect(SEVERITY_LEVELS).toContain('Medium');
    expect(SEVERITY_LEVELS).toContain('Low');
    expect(SEVERITY_LEVELS.length).toBe(4);
  });
});
