import React from 'react';
import { useAuth } from './AuthContext';
import { useStudentSchedules } from './StudentScheduleContext';
import { classReminders, mergeReminderInbox, markReminderRead } from '../utils/classReminders';

const StudentReminderContext = React.createContext(null);
const emptyInbox = () => ({ notifications: [], readKeys: [] });
function readInbox(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(data?.notifications) && Array.isArray(data?.readKeys)) return {
      notifications: data.notifications.filter(row => row && typeof row.key === 'string' && typeof row.classDate === 'string'),
      readKeys: data.readKeys.filter(value => typeof value === 'string'),
    };
  } catch { /* Memory-only fallback when storage is unavailable. */ }
  return emptyInbox();
}

export function StudentReminderProvider({ children }) {
  const { currentUser, session } = useAuth();
  const { schedules, loading, error } = useStudentSchedules();
  const storageKey = `student-reminder-inbox:v1:${session.userId}`;
  const [inbox, setInbox] = React.useState(() => readInbox(storageKey));
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  React.useEffect(() => {
    if (loading || error) return;
    const due = classReminders(schedules, currentUser, now);
    setInbox(previous => mergeReminderInbox(previous, due));
  }, [schedules, currentUser, now, loading, error]);
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(inbox)); } catch { /* Keep unread items in memory. */ }
  }, [inbox, storageKey]);
  const markRead = React.useCallback(key => setInbox(previous => markReminderRead(previous, key)), []);
  const value = React.useMemo(() => ({ notifications: inbox.notifications, markRead, now }), [inbox, markRead, now]);
  return <StudentReminderContext.Provider value={value}>{children}</StudentReminderContext.Provider>;
}

export function useStudentReminders() {
  return React.useContext(StudentReminderContext);
}
