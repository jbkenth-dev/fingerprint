import { attendanceSessions, attendanceWindow, studentSection } from './attendance.js';

export function manualAttendanceRows(logs, students, schedule, date) {
  const window = schedule && attendanceWindow(schedule);
  if (!window || !date) return [];
  const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  if (!schedule.days?.includes(weekday)) return [];
  const sessions = attendanceSessions(logs.filter(log => log.logDate === date));
  const firstCheckIns = new Map();
  for (const session of sessions) {
    if (session.rawInTime === null || session.rawInTime < window.opens || session.rawInTime > window.closes) continue;
    const key = String(session.userId);
    const earlier = firstCheckIns.get(key);
    if (!earlier || session.rawInTime < earlier.rawInTime) firstCheckIns.set(key, session);
  }
  return students.filter(student => {
    const section = studentSection(student);
    return student.role === 'student' && student.status === 'Active' && section?.yearLevel === schedule.yearLevel && section?.section === schedule.section;
  }).map(student => {
    const session = firstCheckIns.get(String(student.id));
    return { ...student, attendanceStatus: !session ? 'Absent' : session.rawInTime <= window.presentUntil ? 'Present' : 'Late',
      timeIn: session?.timeIn || '—' };
  });
}
