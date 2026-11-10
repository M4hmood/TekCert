/** TEK-UP is in Tunis: the activity roll-up and the web app count days there. */
export const TIME_ZONE = 'Africa/Tunis';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day in Tunis, "2026-11-10". */
export function tunisDay(at: Date): string {
  return dayFormat.format(at);
}

/** Year and specialty as the dashboard shows them: "ING-4 CIM", or "ING-2" before a specialty. */
export function groupLabel(year: number, specialtyCode: string | null | undefined): string {
  return specialtyCode ? `ING-${year} ${specialtyCode}` : `ING-${year}`;
}
