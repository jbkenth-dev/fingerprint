import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, CheckCheck, Clock, X } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useStudentSchedules } from '../state/StudentScheduleContext';
import { attendanceTime } from '../utils/attendance';
import { classReminders, classReminderStatus } from '../utils/classReminders';
import { useStudentReminders } from '../state/StudentReminderContext';

export default function StudentNotifications() {
  const { loading, error } = useStudentSchedules();
  const { notifications: reminders, markRead, now } = useStudentReminders();
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const buttonRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const titleId = React.useId();
  const location = useLocation();
  const unread = reminders.length;

  React.useEffect(() => { setOpen(false); }, [location.pathname]);
  React.useEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 10, left: Math.max(12, Math.min(rect.right - 360, window.innerWidth - 372)) });
    };
    const closeOutside = event => {
      if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    positionPanel();
    panelRef.current?.focus();
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }, [open]);

  return <>
    <button ref={buttonRef} type="button" onClick={() => setOpen(value => !value)}
      aria-label={`Class reminders${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} aria-controls={open ? titleId : undefined}
      className={`relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 ${unread ? 'border-amber-400 bg-amber-100 text-amber-950 shadow-sm ring-2 ring-amber-200 ring-offset-2 hover:bg-amber-200' : open ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
      <Bell size={20} className={unread ? "fill-amber-300 motion-safe:animate-pulse" : ""} />
      {unread > 0 && <span className="hidden text-xs font-bold sm:inline">Class reminder</span>}
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && createPortal(<section ref={panelRef} id={titleId} tabIndex={-1} aria-label="Class reminders"
      style={position} className="fixed z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-xl outline-none">
      <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${unread ? "border-amber-200 bg-amber-50" : "border-gray-100"}`}>
        <div><h2 className="text-sm font-semibold text-gray-900">Class reminders</h2><p className="mt-1 text-xs text-gray-500">30-minute reminders stay here until read</p></div>
        <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Close reminders" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button>
      </div>
      {unread > 0 && <div className="flex justify-end border-b border-gray-100 px-4 py-2"><button type="button" onClick={() => markRead()} className="inline-flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium text-green-700 hover:bg-green-50"><CheckCheck size={14} />Mark all as read</button></div>}
      <div className="max-h-[min(360px,50dvh)] overflow-y-auto">
        {loading && !reminders.length ? <p role="status" className="px-5 py-10 text-center text-sm text-gray-500">Loading your schedule...</p>
          : error && !reminders.length ? <div className="px-5 py-8 text-center"><p className="text-sm font-medium text-gray-700">Reminders unavailable</p><p className="mt-2 text-xs text-gray-500">Refresh your schedule to try again.</p></div>
          : reminders.length ? <ul className="divide-y divide-gray-100">{reminders.map(reminder => <li key={reminder.key} className="flex gap-3 border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
            <span className="mt-0.5 h-fit rounded-lg bg-green-100 p-2 text-green-700"><Clock size={16} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-green-700">{classReminderStatus(reminder, now)}</p><h3 className="mt-1 text-sm font-semibold text-gray-900">{reminder.subjectName}</h3><p className="mt-1 text-xs text-gray-600">{attendanceTime(reminder.startTime)} &ndash; {attendanceTime(reminder.endTime)}</p>{reminder.facultyName && <p className="mt-1 text-xs text-gray-500">{reminder.facultyName}</p>}
              <button type="button" onClick={() => markRead(reminder.key)} aria-label={`Mark ${reminder.subjectName} reminder as read`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"><CheckCheck size={13} />Mark as read</button>
            </div>
          </li>)}</ul> : <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Bell size={20} /></span><p className="mt-3 text-sm font-semibold text-gray-700">You're all caught up</p><p className="mt-1 text-xs leading-relaxed text-gray-500">No unread class reminders. New reminders appear 30 minutes before class.</p></div>}
      </div>
      <Link to="/student/schedule" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold text-green-700 hover:bg-green-50"><CalendarDays size={14} />View my schedule</Link>
    </section>, document.body)}
  </>;
}


export function StudentReminderBanner() {
  const { currentUser } = useAuth();
  const { schedules, loading, error } = useStudentSchedules();
  const { now, notifications } = useStudentReminders();
  const reminders = classReminders(schedules, currentUser, now).filter(row => notifications.some(item => item.key === row.key));
  if (loading || error || !reminders.length) return null;
  const next = reminders[0];
  const urgent = next.minutesUntil <= 5;
  return <aside role="status" aria-live="polite" aria-atomic="true"
    className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 p-4 shadow-sm sm:p-5 ${urgent ? 'border-red-600 bg-red-50 ring-1 ring-red-200' : 'border-amber-500 bg-amber-50 ring-1 ring-amber-200'}`}>
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${urgent ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'}`}><Bell size={22} className="motion-safe:animate-pulse" /></span>
      <div className="min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wide ${urgent ? 'text-red-700' : 'text-amber-800'}`}>{next.minutesUntil === 0 ? 'Your class is starting now' : `Your class starts in ${next.minutesUntil} ${next.minutesUntil === 1 ? 'minute' : 'minutes'}`}</p>
        <p className="mt-1 text-base font-bold text-gray-900">{next.subjectName}</p>
        <p className="mt-1 text-sm text-gray-700">{attendanceTime(next.startTime)} &ndash; {attendanceTime(next.endTime)}{next.facultyName ? ` / ${next.facultyName}` : ''}</p>
        {reminders.length > 1 && <p className="mt-1 text-xs font-medium text-gray-600">{reminders.length - 1} more {reminders.length === 2 ? 'class starts' : 'classes start'} soon. Check your notification bell.</p>}
      </div>
    </div>
    <Link to="/student/schedule" className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${urgent ? 'bg-red-700 hover:bg-red-800 focus-visible:outline-red-700' : 'bg-amber-800 hover:bg-amber-900 focus-visible:outline-amber-800'}`}><CalendarDays size={15} />View schedule</Link>
  </aside>;
}
