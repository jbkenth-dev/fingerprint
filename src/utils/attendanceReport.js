import { classifyAttendance, datesInRange, studentSection } from './attendance.js';

const dayAbbreviations = {
  Monday: 'M', Tuesday: 'T', Wednesday: 'W', Thursday: 'TH',
  Friday: 'F', Saturday: 'S', Sunday: 'SU',
};

export function formatReportDays(days = []) {
  return days.map(day => dayAbbreviations[day] || day).join(', ');
}

export function buildAttendanceReport(logs, users, schedule, start, end, now = new Date()) {
  const roster = users.filter(user => {
    const section = studentSection(user);
    return user.role === 'student' && user.status === 'Active' &&
      section?.yearLevel === schedule.yearLevel && section?.section === schedule.section;
  });
  const classified = classifyAttendance(logs, roster, [schedule], start, end, now);
  const rows = roster.map(user => ({
    userId: user.id, idNumber: user.idNumber || user.username || 'N/A',
    name: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
    present: 0, late: 0, absent: 0, total: 0,
  })).sort((a, b) => a.name.localeCompare(b.name) || String(a.idNumber).localeCompare(String(b.idNumber)));
  const byId = new Map(rows.map(row => [String(row.userId), row]));
  for (const [status, entries] of Object.entries(classified)) {
    for (const entry of entries) {
      const row = byId.get(String(entry.userId));
      row[status]++;
      row.total++;
    }
  }
  const totals = rows.reduce((sum, row) => {
    for (const key of ['present', 'late', 'absent', 'total']) sum[key] += row[key];
    return sum;
  }, { present: 0, late: 0, absent: 0, total: 0 });
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const classDates = datesInRange(start, end).filter(date =>
    schedule.days?.includes(weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()]));
  const details = Object.values(classified).flat().sort((a, b) =>
    a.logDate.localeCompare(b.logDate) || a.name.localeCompare(b.name));
  return { rows, totals, details, classDates, generatedAt: now, start, end, schedule };
}
