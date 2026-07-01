// Lightweight date utilities — no external deps

export function formatDate(date: Date | string, fmt: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  const tokens = [
    ['EEEE', DAYS_FULL[d.getDay()]],
    ['EEE', DAYS_SHORT[d.getDay()]],
    ['MMMM', MONTHS_FULL[d.getMonth()]],
    ['MMM', MONTHS_SHORT[d.getMonth()]],
    ['MM', pad(d.getMonth() + 1)],
    ['yyyy', String(d.getFullYear())],
    ['yy', String(d.getFullYear()).slice(2)],
    ['dd', pad(d.getDate())],
    ['d', String(d.getDate())],
    ['HH', pad(d.getHours())],
    ['mm', pad(d.getMinutes())],
  ] as const;
  
  // Use placeholder strategy to prevent substring collisions
  let result = fmt;
  const placeholders: { [key: string]: string } = {};
  
  // Replace tokens with placeholders first
  for (let i = 0; i < tokens.length; i++) {
    const [token, value] = tokens[i];
    const placeholder = `__PLACEHOLDER_${i}__`;
    placeholders[placeholder] = value;
    result = result.replaceAll(token, placeholder);
  }
  
  // Replace placeholders with actual values
  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replaceAll(placeholder, value);
  }
  
  return result;
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function subMonths(date: Date, n: number): Date {
  return addMonths(date, -n);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date, weekStartsOn = 1): Date {
  const d = startOfWeek(date, weekStartsOn);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function differenceInDays(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date): boolean {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
         date.getMonth() === t.getMonth() &&
         date.getDate() === t.getDate();
}

export function parseISO(s: string): Date {
  return new Date(s);
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatUGX(amount: number): string {
  return 'UGX ' + Math.round(amount).toLocaleString('en-UG');
}
