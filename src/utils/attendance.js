const manilaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function manilaNow(now = new Date()) {
  const parts = Object.fromEntries(manilaFormatter.formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function datesInRange(start, end) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || start > end) return [];
  const dates = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

// Query the entire range per API page instead of opening a DB connection for every day.
export async function fetchAttendanceRange(fetcher, start, end, signal, options = {}) {
  if (!datesInRange(start, end).length) throw new Error('Select a valid attendance date range.');
  const records = [];
  let total = Infinity;
  while (records.length < total) {
    signal?.throwIfAborted();
    const params = new URLSearchParams({ limit: '500', offset: String(records.length) });
    if (start === end) params.set('date', start);
    else {
      params.set('startDate', start);
      params.set('endDate', end);
    }
    const result = await fetcher(`/attendance.php?${params}`, { ...options, signal });
    if (start !== end && (result.range?.startDate !== start || result.range?.endDate !== end)) {
      throw new Error('The attendance API needs updating to support date ranges.');
    }
    const page = Array.isArray(result.records) ? result.records : [];
    total = Number(result.total ?? page.length);
    if (!page.length) {
      if (records.length < total) throw new Error('Attendance data changed while loading. Please refresh.');
      break;
    }
    records.push(...page);
  }
  return records.filter(record => record.logDate >= start && record.logDate <= end);
}

export function timeMinutes(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return null;
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

export function attendanceTime(value) {
  const minutes = timeMinutes(value);
  if (minutes === null) return '—';
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function attendanceWindow(schedule) {
  const start = timeMinutes(schedule.startTime);
  const end = timeMinutes(schedule.endTime);
  if (start === null || end === null || end <= start) return null;
  const label = minutes => {
    const normalized = (minutes + 1440) % 1440;
    return attendanceTime(`${Math.floor(normalized / 60)}:${String(normalized % 60).padStart(2, '0')}`);
  };
  return {
    opens: start - 15, presentUntil: start + 15, closes: end - 15,
    presentLabel: `${label(start - 15)} – ${label(start + 15)}`,
    lateLabel: `${label(start + 16)} – ${label(end - 15)}`,
  };
}

export function studentSection(student) {
  const match = student.department?.match(/(\d)[^-]*-\s*([A-E])$|(\d)\s*([A-E])$/i);
  if (!match) return null;
  return { yearLevel: ['', '1st Year', '2nd Year', '3rd Year', '4th Year'][Number(match[1] || match[3])], section: (match[2] || match[4]).toUpperCase() };
}

function scheduledFor(schedule, date, student) {
  const section = studentSection(student);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${date}T00:00:00Z`).getUTCDay()];
  return section && schedule.yearLevel === section.yearLevel && schedule.section === section.section &&
    Array.isArray(schedule.days) && schedule.days.includes(weekday);
}

export function attendanceSessions(logs) {
  const groups = new Map();
  for (const log of logs) {
    if (isManualAttendance(log)) continue;
    const key = `${log.userId}-${log.logDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(log);
  }
  const sessions = [];
  for (const records of groups.values()) {
    records.sort((a, b) => String(a.logTime).localeCompare(String(b.logTime)) || Number(a.id) - Number(b.id));
    const pending = [];
    for (const record of records) {
      if (record.status === 'IN') {
        const session = { ...record, key: `in-${record.id}`, rawInTime: timeMinutes(record.logTime), timeIn: attendanceTime(record.logTime), timeOut: '—' };
        pending.push(session);
        sessions.push(session);
      } else if (record.status === 'OUT') {
        // Each IN uses its nearest following OUT. Earlier or repeated IN scans
        // must not consume the OUT needed by a scheduled class check-in.
        if (pending.length) {
          for (const session of pending) session.timeOut = attendanceTime(record.logTime);
          pending.length = 0;
        }
        else sessions.push({ ...record, key: `out-${record.id}`, rawInTime: null, timeIn: '—', timeOut: attendanceTime(record.logTime) });
      }
    }
  }
  return sessions;
}

export function manualScheduleId(log) {
  const source = /^faculty-manual:(\d+):IN$/.exec(log.source || '');
  if (source) return source[1];
  if (log.source !== 'faculty-manual') return null;
  const match = /^manual:(\d+):(\d+):(\d{4}-\d{2}-\d{2})$/.exec(log.localRecordId || '');
  return match && match[2] === String(log.userId) && match[3] === log.logDate ? match[1] : null;
}

export function isManualAttendance(log) {
  return String(log.source || '').startsWith('faculty-manual');
}

export function manualOutRecord(logs, scheduleId, userId, date) {
  return logs.find(log => isManualAttendance(log) && String(log.userId) === String(userId) &&
    log.logDate === date && ([`faculty-manual:${scheduleId}:OUT:P`, `faculty-manual:${scheduleId}:OUT:L`, `faculty-manual:${scheduleId}:OUT:A`].includes(log.source) ||
      log.localRecordId === `manual:${scheduleId}:${userId}:${date}:out`));
}

export function manualOutStatus(log, inStatus) {
  if (!log || log.status === 'ABSENT') return 'Absent';
  if (log.source === 'faculty-manual-out-late' || /^faculty-manual:\d+:OUT:L$/.test(log.source)) return 'Late';
  if (log.source === 'faculty-manual-out-present' || /^faculty-manual:\d+:OUT:P$/.test(log.source)) return 'Present';
  return inStatus === 'Absent' ? 'Present' : inStatus;
}

export function manualAttendanceStatus(log, schedule) {
  if (log.status === 'ABSENT') return 'Absent';
  return timeMinutes(log.logTime) <= timeMinutes(schedule.startTime) + 15 ? 'Present' : 'Late';
}

export function manualPairedSession(logs, manual) {
  if (manual.status !== 'IN') return null;
  // Pair the edited IN with an existing device OUT without treating it as a scan
  // for other classes. Explicit manual OUT marks still take priority.
  return attendanceSessions(logs.map(log => String(log.id) === String(manual.id) ? { ...log, source: 'manual-pair' } : log))
    .find(session => String(session.id) === String(manual.id));
}

export function classifyAttendance(logs, users, schedules, start, end, now = new Date()) {
  const clock = manilaNow(now);
  const results = { present: [], late: [], absent: [] };
  const sessions = attendanceSessions(logs);
  const manualMarks = new Map(logs.filter(log => manualScheduleId(log) !== null)
    .map(log => [`${log.userId}-${log.logDate}-${manualScheduleId(log)}`, log]));
  const byStudentDate = new Map();
  for (const session of sessions) {
    const key = `${session.userId}-${session.logDate}`;
    if (!byStudentDate.has(key)) byStudentDate.set(key, []);
    byStudentDate.get(key).push(session);
  }
  for (const date of datesInRange(start, end).reverse()) {
    if (date > clock.date) continue;
    for (const schedule of schedules) {
      const window = attendanceWindow(schedule);
      if (!window) continue;
      for (const student of users.filter(u => u.role === 'student' && u.status === 'Active')) {
        if (!scheduledFor(schedule, date, student)) continue;
        const candidates = (byStudentDate.get(`${student.id}-${date}`) || [])
          .filter(s => s.rawInTime !== null && s.rawInTime >= window.opens && s.rawInTime <= window.closes);
        const session = candidates[0];
        const manual = manualMarks.get(`${student.id}-${date}-${schedule.id}`);
        const paired = manual ? manualPairedSession(logs, manual) : session;
        const outMark = manualOutRecord(logs, schedule.id, student.id, date);
        // Do not mark an ongoing or upcoming class absent before its check-in window closes.
        if (!manual && !session && date === clock.date && clock.minutes <= window.closes) continue;
        const status = manual ? manualAttendanceStatus(manual, schedule) : !session ? 'Absent' : session.rawInTime <= window.presentUntil ? 'Present' : 'Late';
        results[status.toLowerCase()].push({
          key: `${date}-${schedule.id ?? `${schedule.subjectCode}-${schedule.startTime}`}-${student.id}`,
          userId: student.id, scheduleId: schedule.id, logDate: date,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
          idNumber: student.idNumber || student.username || 'N/A',
          classes: `${schedule.subjectCode} — ${schedule.subjectName}`,
          timeSchedule: `${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}`,
          timeIn: manual ? status === 'Absent' ? '' : attendanceTime(manual.logTime) : session?.timeIn || '',
          timeOut: outMark ? outMark.status === 'OUT' ? attendanceTime(outMark.logTime) : '' : manual && paired?.timeOut === '—' ? '' : paired?.timeOut || '', status,
          reason: manual ? 'Updated by faculty' : !session ? 'No check-in during class schedule' : status === 'Present' ? 'On time' : 'Late arrival',
        });
      }
    }
  }
  return results;
}

export function liveAttendance(logs, users, schedules, date) {
  const manual = logs.filter(log => log.logDate === date && manualScheduleId(log) !== null);
  const sessions = attendanceSessions(logs.filter(log => log.logDate === date));
  const scanned = sessions.map(session => {
    const student = users.find(u => String(u.id) === String(session.userId));
    const schedule = student && student.role === 'student' && student.status === 'Active' && schedules.find(s => {
      const window = attendanceWindow(s);
      return window && scheduledFor(s, date, student) && session.rawInTime !== null &&
        session.rawInTime >= window.opens && session.rawInTime <= window.closes;
    });
    const outMark = schedule && manualOutRecord(logs, schedule.id, session.userId, date);
    return { ...session, timeOut: outMark ? outMark.status === 'OUT' ? attendanceTime(outMark.logTime) : '—' : session.timeOut,
      scheduleId: schedule?.id, classes: schedule ? `${schedule.subjectCode} — ${schedule.subjectName}` : '—',
      timeSchedule: schedule ? `${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}` : '—',
      status: schedule ? session.rawInTime <= timeMinutes(schedule.startTime) + 15 ? 'Present' : 'Late' : 'Unscheduled',
      reason: schedule ? 'Scheduled class' : 'No matching class schedule',
    };
  }).filter(session => !manual.some(log => String(log.userId) === String(session.userId) && manualScheduleId(log) === String(session.scheduleId)));
  const recorded = manual.flatMap(log => {
    const schedule = schedules.find(row => String(row.id) === manualScheduleId(log));
    if (!schedule) return [];
    const status = manualAttendanceStatus(log, schedule);
    const outMark = manualOutRecord(logs, schedule.id, log.userId, date);
    const window = attendanceWindow(schedule);
    const existing = manualPairedSession(logs, log) || (window && sessions.find(session => String(session.userId) === String(log.userId) &&
      session.rawInTime !== null && session.rawInTime >= window.opens && session.rawInTime <= window.closes));
    return [{ ...log, key: `manual-${log.id}`, scheduleId: schedule.id, status,
      timeIn: status === 'Absent' ? '—' : attendanceTime(log.logTime),
      timeOut: outMark ? outMark.status === 'OUT' ? attendanceTime(outMark.logTime) : '—' : existing?.timeOut || '—',
      classes: `${schedule.subjectCode} — ${schedule.subjectName}`,
      timeSchedule: `${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}`, reason: 'Updated by faculty' }];
  });
  return [...scanned, ...recorded].sort((a, b) => String(b.logTime).localeCompare(String(a.logTime)) || Number(b.id) - Number(a.id));
}

export function searchAttendance(records, term) {
  const search = term.trim().toLowerCase();
  return records.filter(record => !search || String(record.name || '').toLowerCase().includes(search) || String(record.idNumber || '').toLowerCase().includes(search));
}
