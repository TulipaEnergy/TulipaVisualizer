export enum Resolution {
  Hours = "hours",
  Days = "days",
  Weeks = "weeks",
  Months = "months",
  Years = "years",
}

export const resolutionToTable: Record<Resolution, number> = {
  [Resolution.Hours]: 1,
  [Resolution.Days]: 24,
  [Resolution.Weeks]: 168,
  [Resolution.Months]: 720,
  [Resolution.Years]: 8760,
};
