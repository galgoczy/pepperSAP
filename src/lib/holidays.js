// Hungarian public holidays
// Fixed dates + Easter-based movable holidays

export function getHungarianHolidays(year) {
  const holidays = new Set();

  // Fixed holidays
  const fixedHolidays = [
    `${year}-01-01`, // Újév
    `${year}-03-15`, // Nemzeti ünnep
    `${year}-05-01`, // Munka ünnepe
    `${year}-08-20`, // Államalapítás
    `${year}-10-23`, // 1956-os forradalom
    `${year}-11-01`, // Mindenszentek
    `${year}-12-25`, // Karácsony
    `${year}-12-26`, // Karácsony másnapja
  ];

  fixedHolidays.forEach(d => holidays.add(d));

  // Calculate Easter Sunday (Meeus/Jones/Butcher algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day);

  // Easter-based holidays
  // Nagypéntek (Good Friday) - 2 days before Easter
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.add(goodFriday.toISOString().split('T')[0]);

  // Húsvét hétfő (Easter Monday) - 1 day after Easter
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.add(easterMonday.toISOString().split('T')[0]);

  // Pünkösd hétfő (Whit Monday) - 50 days after Easter
  const whitMonday = new Date(easter);
  whitMonday.setDate(easter.getDate() + 50);
  holidays.add(whitMonday.toISOString().split('T')[0]);

  return holidays;
}

export function isHungarianHoliday(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const holidays = getHungarianHolidays(year);
  const dateStr = d.toISOString().split('T')[0];
  return holidays.has(dateStr);
}

export function isWeekend(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isWorkingDay(date) {
  return !isWeekend(date) && !isHungarianHoliday(date);
}

export function getPreviousWorkingDay(fromDate = new Date()) {
  const date = typeof fromDate === 'string' ? new Date(fromDate) : new Date(fromDate);

  // Start from the day before
  date.setDate(date.getDate() - 1);

  // Keep going back until we find a working day
  while (!isWorkingDay(date)) {
    date.setDate(date.getDate() - 1);
  }

  return date.toISOString().split('T')[0];
}

export function getWorkingDaysInRange(startDate, endDate) {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  const workingDays = [];
  const current = new Date(start);

  while (current <= end) {
    if (isWorkingDay(current)) {
      workingDays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}
