import { manilaNow, studentSection, timeMinutes } from './attendance.js';

export const CLASS_REMINDER_MINUTES = 30;

export function classReminders(schedules, student, now = new Date()) {
  const section = studentSection(student || {});
  if (!section) return [];
  const { date, minutes } = manilaNow(now);
  const tomorrow = new Date(`${date}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dates = [date, tomorrow.toISOString().slice(0, 10)];
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dates.flatMap((classDate, offset) => {
    const day = weekdays[new Date(`${classDate}T00:00:00Z`).getUTCDay()];
    return schedules.filter(schedule => schedule.yearLevel === section.yearLevel && schedule.section === section.section &&
      Array.isArray(schedule.days) && schedule.days.includes(day)).flatMap(schedule => {
      const start = timeMinutes(schedule.startTime);
      if (start === null) return [];
      const minutesUntil = start + offset * 1440 - minutes;
      if (minutesUntil < 0 || minutesUntil > CLASS_REMINDER_MINUTES) return [];
      return [{ ...schedule, key: `${classDate}:${schedule.id}:${schedule.startTime}`, classDate, minutesUntil }];
    });
  }).sort((a, b) => a.minutesUntil - b.minutesUntil || String(a.subjectName).localeCompare(String(b.subjectName)));
}

export function mergeReminderInbox(inbox, incoming) {
  const known = new Set([...inbox.readKeys, ...inbox.notifications.map(row => row.key)]);
  const added = incoming.filter(row => !known.has(row.key));
  if (!added.length) return inbox;
  return { ...inbox, notifications: [...inbox.notifications, ...added] };
}

export function markReminderRead(inbox, key) {
  const marked = inbox.notifications.filter(row => key === undefined || row.key === key);
  if (!marked.length) return inbox;
  const readKeys = [...new Set([...inbox.readKeys, ...marked.map(row => row.key)])];
  return { readKeys, notifications: inbox.notifications.filter(row => !readKeys.includes(row.key)) };
}


export function classReminderStatus(reminder, now = new Date()) {
  const start = timeMinutes(reminder.startTime);
  const end = timeMinutes(reminder.endTime);
  const clock = manilaNow(now);
  const dayOffset = (Date.parse(clock.date) - Date.parse(reminder.classDate)) / 86400000;
  if (start === null || end === null || !Number.isFinite(dayOffset)) return 'Class reminder';
  const current = dayOffset * 1440 + clock.minutes;
  const endMinute = end <= start ? end + 1440 : end;
  const duration = minutes => `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  if (current < start) return `Starts in ${duration(start - current)}`;
  if (current >= endMinute) {
    const elapsed = current - endMinute;
    return elapsed === 0 ? 'Class ended just now' : `Class ended / ${duration(elapsed)} ago`;
  }
  const elapsed = current - start;
  return elapsed === 0 ? 'In class / starting now' : `In class / started ${duration(elapsed)} ago`;
}
