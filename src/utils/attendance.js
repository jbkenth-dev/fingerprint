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

// Use the existing date endpoint, including every API page, with bounded concurrency.
export async function fetchAttendanceRange(fetcher, start, end, signal) {
  const dates = datesInRange(start, end);
  const results = new Array(dates.length);
  let next = 0;
  async function worker() {
    while (next < dates.length) {
      const index = next++;
      const date = dates[index];
      const records = [];
      let total = Infinity;
      while (records.length < total) {
        signal?.throwIfAborted();
        const params = new URLSearchParams({ date, limit: '500', offset: String(records.length) });
        const result = await fetcher(`/attendance.php?${params}`, { signal });
        const page = Array.isArray(result.records) ? result.records : [];
        total = Number(result.total ?? page.length);
        if (!page.length) {
          if (records.length < total) throw new Error('Attendance data changed while loading. Please refresh.');
          break;
        }
        records.push(...page);
      }
      results[index] = records.filter(record => record.logDate === date);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, dates.length) }, worker));
  return results.flat();
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

function studentSection(student) {
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
        if (pending.length) pending.shift().timeOut = attendanceTime(record.logTime);
        else sessions.push({ ...record, key: `out-${record.id}`, rawInTime: null, timeIn: '—', timeOut: attendanceTime(record.logTime) });
      }
    }
  }
  return sessions;
}

export function classifyAttendance(logs, users, schedules, start, end, now = new Date()) {
  const clock = manilaNow(now);
  const results = { present: [], late: [], absent: [] };
  const sessions = attendanceSessions(logs);
  const byStudentDate = new Map();
  for (const session of sessions) {
    const key = `${session.userId}-${session.logDate}`;
    if (!byStudentDate.has(key)) byStudentDate.set(key, []);
    byStudentDate.get(key).push(session);
  }
  for (const date of datesInRange(start, end).reverse()) {
    if (date > clock.date) continue;
    for (const schedule of schedules) {
      const startMin = timeMinutes(schedule.startTime);
      const endMin = timeMinutes(schedule.endTime);
      if (startMin === null || endMin === null) continue;
      for (const student of users.filter(u => u.role === 'student' && u.status === 'Active')) {
        if (!scheduledFor(schedule, date, student)) continue;
        const candidates = (byStudentDate.get(`${student.id}-${date}`) || [])
          .filter(s => s.rawInTime !== null && s.rawInTime >= startMin - 15 && s.rawInTime <= endMin + 15);
        const session = candidates[0];
        // Do not mark an ongoing or upcoming class absent before its check-in window closes.
        if (!session && date === clock.date && clock.minutes <= endMin + 15) continue;
        const status = !session ? 'Absent' : session.rawInTime <= startMin + 15 ? 'Present' : 'Late';
        results[status.toLowerCase()].push({
          key: `${date}-${schedule.id ?? `${schedule.subjectCode}-${schedule.startTime}`}-${student.id}`,
          userId: student.id, logDate: date,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
          idNumber: student.idNumber || student.username || 'N/A',
          classes: `${schedule.subjectCode} — ${schedule.subjectName}`,
          timeSchedule: `${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}`,
          timeIn: session?.timeIn || '—', timeOut: session?.timeOut || '—', status,
          reason: !session ? 'No check-in during class window' : status === 'Present' ? 'On time' : 'Late arrival',
        });
      }
    }
  }
  return results;
}

export function liveAttendance(logs, users, schedules, date) {
  return attendanceSessions(logs.filter(log => log.logDate === date)).map(session => {
    const student = users.find(u => String(u.id) === String(session.userId));
    const schedule = student && schedules.find(s => scheduledFor(s, date, student) &&
      session.rawInTime !== null && session.rawInTime >= timeMinutes(s.startTime) - 15 && session.rawInTime <= timeMinutes(s.endTime) + 15);
    return { ...session, classes: schedule ? `${schedule.subjectCode} — ${schedule.subjectName}` : '—',
      timeSchedule: schedule ? `${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}` : '—',
      status: schedule ? session.rawInTime <= timeMinutes(schedule.startTime) + 15 ? 'Present' : 'Late' : 'Unscheduled',
      reason: schedule ? 'Scheduled class' : 'No matching class schedule',
    };
  }).sort((a, b) => String(b.logTime).localeCompare(String(a.logTime)) || Number(b.id) - Number(a.id));
}

export function searchAttendance(records, term) {
  const search = term.trim().toLowerCase();
  return records.filter(record => !search || String(record.name || '').toLowerCase().includes(search) || String(record.idNumber || '').toLowerCase().includes(search));
}
