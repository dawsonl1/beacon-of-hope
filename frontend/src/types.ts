export interface ImpactSummary {
  totalResidents: number;
  activeResidents: number;
  activeSafehouses: number;
  totalDonations: number;
  completedReintegrations: number;
  reintegrationRate: number;
}

export interface MonthlyDataPoint {
  year: number;
  month: number;
}
