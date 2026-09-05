/**
 * Deterministic Date & Time Formatting for mr.technologies
 * Avoids React hydration mismatches caused by locale / ICU variations across Node.js and browsers.
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getISTDate(dateInput: string | Date | number): Date | null {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  // Account for system timezone offset to get pure UTC timestamp, then shift +5h30m (330 mins) for IST
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 330 * 60000);
}

export function formatDateFullIST(dateInput: string | Date | number): string {
  const ist = getISTDate(dateInput);
  if (!ist) return 'Scheduled Date';
  return `${DAYS_FULL[ist.getDay()]}, ${MONTHS_FULL[ist.getMonth()]} ${ist.getDate()}, ${ist.getFullYear()}`;
}

export function formatTimeIST(dateInput: string | Date | number): string {
  const ist = getISTDate(dateInput);
  if (!ist) return 'Scheduled Time';
  let hours = ist.getHours();
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm} IST`;
}

export function formatDateTimeShortIST(dateInput: string | Date | number): string {
  const ist = getISTDate(dateInput);
  if (!ist) return 'Date Pending';
  const month = MONTHS_SHORT[ist.getMonth()];
  const day = ist.getDate();
  let hours = ist.getHours();
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${month} ${day}, ${formattedHours}:${minutes} ${ampm} IST`;
}

export function getDatePartsIST(dateInput: string | Date | number) {
  const ist = getISTDate(dateInput);
  if (!ist) {
    return { month: 'TBD', day: '--', weekday: 'TBD', time: '--:-- IST' };
  }
  let hours = ist.getHours();
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');

  return {
    month: MONTHS_SHORT[ist.getMonth()],
    day: String(ist.getDate()),
    weekday: DAYS_SHORT[ist.getDay()],
    time: `${formattedHours}:${minutes} ${ampm} IST`
  };
}
