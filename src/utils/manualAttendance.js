import { attendanceSessions, attendanceTime, attendanceWindow, manualAttendanceStatus, manualOutRecord, manualOutStatus, manualPairedSession, manualScheduleId, studentSection } from './attendance.js';

export function manualAttendanceRows(logs, students, schedule, date) {
  const window = schedule && attendanceWindow(schedule);
  if (!window || !date) return [];
  const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  if (!schedule.days?.includes(weekday)) return [];
  const sessions = attendanceSessions(logs.filter(log => log.logDate === date));
  const firstCheckIns = new Map();
  const manualMarks = new Map(logs.filter(log => log.logDate === date && manualScheduleId(log) === String(schedule.id))
    .map(log => [String(log.userId), log]));
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
    const manual = manualMarks.get(String(student.id));
    const status = manual ? manualAttendanceStatus(manual, schedule) : !session ? 'Absent' : session.rawInTime <= window.presentUntil ? 'Present' : 'Late';
    const out = manualOutRecord(logs, schedule.id, student.id, date);
    const paired = manual ? manualPairedSession(logs, manual) : session;
    const outStatus = out ? manualOutStatus(out, status) : paired?.timeOut && paired.timeOut !== '—' ? status : 'Absent';
    return { ...student, attendanceStatus: status,
      outAttendanceStatus: outStatus,
      timeIn: manual ? status === 'Absent' ? '—' : attendanceTime(manual.logTime) : session?.timeIn || '—',
      timeOut: out ? out.status === 'OUT' ? attendanceTime(out.logTime) : '—' : paired?.timeOut || '—' };
  });
}
