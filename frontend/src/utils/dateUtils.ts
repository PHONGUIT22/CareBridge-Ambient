export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTime24to12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

export function formatDayMonth(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}
