import React from 'react';
import { apiFetch } from '../api';

const StudentScheduleContext = React.createContext(null);

// One schedule request for the student layout. Route changes and reminder ticks
// reuse this snapshot; only an explicit Refresh makes another request.
export function StudentScheduleProvider({ children }) {
  const [schedules, setSchedules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const controllerRef = React.useRef(null);
  const pendingRef = React.useRef(null);
  const load = React.useCallback((force = false) => {
    if (pendingRef.current) return pendingRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    const request = apiFetch('/class-schedules.php', { signal: controller.signal, ...(force ? { cacheTtl: 0 } : {}) })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Unable to read your class schedule.');
        if (!controller.signal.aborted) setSchedules(data);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Unable to load your schedule.'); })
      .finally(() => {
        if (pendingRef.current === request) pendingRef.current = null;
        if (!controller.signal.aborted) setLoading(false);
      });
    pendingRef.current = request;
    return request;
  }, []);
  React.useEffect(() => {
    load();
    return () => { controllerRef.current?.abort(); pendingRef.current = null; };
  }, [load]);
  const refresh = React.useCallback(() => load(true), [load]);
  const value = React.useMemo(() => ({ schedules, loading, error, refresh }), [schedules, loading, error, refresh]);
  return <StudentScheduleContext.Provider value={value}>{children}</StudentScheduleContext.Provider>;
}

export function useStudentSchedules() {
  const value = React.useContext(StudentScheduleContext);
  if (!value) throw new Error('Student schedules require the student layout.');
  return value;
}
