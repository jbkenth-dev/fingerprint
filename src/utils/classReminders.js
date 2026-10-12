import { manilaNow, studentSection, timeMinutes } from './attendance.js';

export function classReminders(schedules, student, now = new Date()) {
  const section = studentSection(student || {});
  if (!section) return [];
  const { date, minutes } = manilaNow(now);
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${date}T00:00:00Z`).getUTCDay()];
  return schedules.filter(schedule => schedule.yearLevel === section.yearLevel && schedule.section === section.section &&
    Array.isArray(schedule.days) && schedule.days.includes(day))
    .flatMap(schedule => {
      const start = timeMinutes(schedule.startTime);
      if (start === null || start < minutes || start - minutes > 15) return [];
      return [{ ...schedule, key: `${date}:${schedule.id}:${schedule.startTime}`, minutesUntil: start - minutes }];
    }).sort((a, b) => a.minutesUntil - b.minutesUntil || String(a.subjectName).localeCompare(String(b.subjectName)));
}
