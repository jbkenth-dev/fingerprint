import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, CheckCheck, Clock, X } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useStudentSchedules } from '../state/StudentScheduleContext';
import { attendanceTime, manilaNow } from '../utils/attendance';
import { classReminders } from '../utils/classReminders';

function readSeen(key) {
  try { const value = JSON.parse(sessionStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export default function StudentNotifications() {
  const { currentUser } = useAuth();
  const { schedules, loading, error } = useStudentSchedules();
  const [now, setNow] = React.useState(() => new Date());
  const [open, setOpen] = React.useState(false);
  const { date } = manilaNow(now);
  const storageKey = `student-class-reminders:${currentUser?.id}:${date}`;
  const [seen, setSeen] = React.useState(() => readSeen(storageKey));
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const buttonRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const titleId = React.useId();
  const location = useLocation();
  const reminders = React.useMemo(() => classReminders(schedules, currentUser, now), [schedules, currentUser, now]);
  const unread = loading || error ? 0 : reminders.filter(reminder => !seen.includes(reminder.key)).length;

  // Local clock only: opening, reading, and ticking never call an API.
  React.useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  React.useEffect(() => {
    const update = event => setSeen(event?.detail?.key === storageKey ? event.detail.seen : readSeen(storageKey));
    update();
    window.addEventListener('student-reminders-read', update);
    return () => window.removeEventListener('student-reminders-read', update);
  }, [storageKey]);
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

  function markRead() {
    const next = [...new Set([...seen, ...reminders.map(reminder => reminder.key)])].slice(-100);
    setSeen(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Memory fallback. */ }
    window.dispatchEvent(new CustomEvent('student-reminders-read', { detail: { key: storageKey, seen: next } }));
  }

  return <>
    <button ref={buttonRef} type="button" onClick={() => { setNow(new Date()); setOpen(value => !value); }}
      aria-label={`Class reminders${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} aria-controls={open ? titleId : undefined}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 ${open ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
      <Bell size={19} />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && createPortal(<section ref={panelRef} id={titleId} tabIndex={-1} aria-label="Class reminders"
      style={position} className="fixed z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-xl outline-none">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div><h2 className="text-sm font-semibold text-gray-900">Class reminders</h2><p className="mt-1 text-xs text-gray-500">Classes starting in the next 15 minutes</p></div>
        <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Close reminders" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button>
      </div>
      {unread > 0 && <div className="flex justify-end border-b border-gray-100 px-4 py-2"><button type="button" onClick={markRead} className="inline-flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium text-green-700 hover:bg-green-50"><CheckCheck size={14} />Mark all as read</button></div>}
      <div className="max-h-[min(360px,50dvh)] overflow-y-auto">
        {loading ? <p role="status" className="px-5 py-10 text-center text-sm text-gray-500">Loading your schedule...</p>
          : error ? <div className="px-5 py-8 text-center"><p className="text-sm font-medium text-gray-700">Reminders unavailable</p><p className="mt-2 text-xs text-gray-500">Refresh your schedule to try again.</p></div>
          : reminders.length ? <ul className="divide-y divide-gray-100">{reminders.map(reminder => <li key={reminder.key} className={`flex gap-3 px-5 py-4 ${!seen.includes(reminder.key) ? 'bg-green-50/60' : ''}`}>
            <span className="mt-0.5 h-fit rounded-lg bg-green-100 p-2 text-green-700"><Clock size={16} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-green-700">{reminder.minutesUntil === 0 ? 'Starting now' : `Starts in ${reminder.minutesUntil} min`}</p><h3 className="mt-1 text-sm font-semibold text-gray-900">{reminder.subjectName}</h3><p className="mt-1 text-xs text-gray-600">{attendanceTime(reminder.startTime)} &ndash; {attendanceTime(reminder.endTime)}</p>{reminder.facultyName && <p className="mt-1 text-xs text-gray-500">{reminder.facultyName}</p>}</div>
            {!seen.includes(reminder.key) && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-600" aria-label="Unread" />}
          </li>)}</ul> : <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Bell size={20} /></span><p className="mt-3 text-sm font-semibold text-gray-700">You're all caught up</p><p className="mt-1 text-xs leading-relaxed text-gray-500">No classes starting in the next 15 minutes.</p></div>}
      </div>
      <Link to="/student/schedule" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold text-green-700 hover:bg-green-50"><CalendarDays size={14} />View my schedule</Link>
    </section>, document.body)}
  </>;
}
