export const CASE_STATUSES = ['Active', 'Closed', 'Discharged'] as const;
export type CaseStatus = typeof CASE_STATUSES[number];

export const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export const SUPPORTER_TYPES = ['MonetaryDonor', 'Volunteer', 'SkillsContributor', 'SocialMediaAdvocate'] as const;
export type SupporterType = typeof SUPPORTER_TYPES[number];

export const SUPPORTER_STATUSES = ['Active', 'Inactive', 'Lapsed', 'Prospective'] as const;
export type SupporterStatus = typeof SUPPORTER_STATUSES[number];

export const DONATION_TYPES = ['Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'] as const;
export type DonationType = typeof DONATION_TYPES[number];

export const VISIT_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'] as const;
export type VisitType = typeof VISIT_TYPES[number];

export const COOPERATION_LEVELS = ['Cooperative', 'Partially Cooperative', 'Uncooperative', 'Hostile'] as const;
export type CooperationLevel = typeof COOPERATION_LEVELS[number];

export const SESSION_TYPES = ['Individual', 'Group', 'Family', 'Crisis', 'Assessment', 'Follow-Up', 'Discharge'] as const;
export type SessionType = typeof SESSION_TYPES[number];

export const REINTEGRATION_TYPES = ['Family Reunification', 'Foster Care', 'Adoption', 'Independent Living', 'None'] as const;
export type ReintegrationType = typeof REINTEGRATION_TYPES[number];

export const REINTEGRATION_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold'] as const;
export type ReintegrationStatus = typeof REINTEGRATION_STATUSES[number];

export const ACQUISITION_CHANNELS = ['SocialMedia', 'Church', 'Event', 'PartnerReferral', 'Campaign', 'Direct', 'Other'] as const;
export type AcquisitionChannel = typeof ACQUISITION_CHANNELS[number];

export const TASK_TYPES = ['ScheduleDoctor', 'ScheduleDentist', 'UpdateEducation', 'InputHealthRecords', 'IncidentFollowUp', 'ScheduleHomeVisit', 'ScheduleReintegration', 'PostPlacementVisit', 'Manual'] as const;
export type TaskType = typeof TASK_TYPES[number];

export const TASK_STATUSES = ['Pending', 'Snoozed', 'Completed', 'Dismissed'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const EVENT_TYPES = ['Counseling', 'DoctorApt', 'DentistApt', 'HomeVisit', 'CaseConference', 'ReintegrationVisit', 'PostPlacementVisit', 'GroupTherapy', 'Other'] as const;
export type EventType = typeof EVENT_TYPES[number];

export const EVENT_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const;
export type EventStatus = typeof EVENT_STATUSES[number];

export const INCIDENT_TYPES = ['Runaway', 'SelfHarm', 'Behavioral', 'Security', 'Medical', 'Other'] as const;
export type IncidentType = typeof INCIDENT_TYPES[number];

export const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];
