/** Build: 2026-04-09T12:45 — HomePage @dnd-kit drag-and-drop */
/** The app's reference date — all data is as of this date */
export const APP_TODAY = new Date(2026, 1, 16); // Feb 16, 2026 (month is 0-indexed)
export const APP_TODAY_STR = '2026-02-16';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Convert CamelCase or PascalCase enum values to human-readable labels.
 *  e.g. "WordOfMouth" → "Word of Mouth", "InKind" → "In-Kind", "SocialMedia" → "Social Media" */
export function formatEnumLabel(value: string): string {
  const special: Record<string, string> = {
    InKind: 'In-Kind',
    MonetaryDonor: 'Monetary Donor',
    SkillsContributor: 'Skills Contributor',
    SocialMediaAdvocate: 'Social Media Advocate',
  };
  if (special[value]) return special[value];
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}
