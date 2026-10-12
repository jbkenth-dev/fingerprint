import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ClipboardCheck, Maximize2, RefreshCw, Search, Users, X } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../state/AuthContext';
import { attendanceTime, attendanceWindow, fetchAttendanceRange, manilaNow } from '../utils/attendance';
import { manualAttendanceRows } from '../utils/manualAttendance';
import { startPolling } from '../utils/polling';

const statuses = [
  { value: 'Present', code: 'P', color: 'text-green-700', bg: 'bg-green-50', accent: 'accent-green-700' },
  { value: 'Late', code: 'L', color: 'text-amber-700', bg: 'bg-amber-50', accent: 'accent-amber-600' },
  { value: 'Absent', code: 'A', color: 'text-red-700', bg: 'bg-red-50', accent: 'accent-red-600' },
];
const nameOf = student => [student.lastName, [student.firstName, student.middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const card = 'rounded-xl border border-gray-200 bg-white shadow-sm';

export default function FacultyManual() {
  const { session } = useAuth();
  const today = manilaNow().date;
  const [data, setData] = React.useState({ schedules: [], students: [] });
  const [scheduleId, setScheduleId] = React.useState('');
  const [date, setDate] = React.useState(today);
  const [logs, setLogs] = React.useState([]);
  const [overrides, setOverrides] = React.useState({});
  const [search, setSearch] = React.useState('');
  const [loadingSchedules, setLoadingSchedules] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState('');
  const [attendanceError, setAttendanceError] = React.useState('');
  const [reload, setReload] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const dialogRef = React.useRef(null);
  const maximizeRef = React.useRef(null);
  const selected = data.schedules.find(row => String(row.id) === scheduleId);
  const weekday = date ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) : '';
  const validDate = Boolean(date && date <= today && selected?.days?.includes(weekday));
  const window = selected && attendanceWindow(selected);
  const roster = React.useMemo(() => validDate ? manualAttendanceRows(logs, data.students, selected, date)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'en', { sensitivity: 'base' })) : [], [logs, data.students, selected, date, validDate]);
  const marks = Object.fromEntries(roster.map(student => [student.id, overrides[student.id] || student.attendanceStatus]));

  React.useEffect(() => {
    if (!isFullscreen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      maximizeRef.current?.focus();
    };
  }, [isFullscreen]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoadingSchedules(true);
    setScheduleError('');
    Promise.all([
      apiFetch('/class-schedules.php', { signal: controller.signal, cacheTtl: 0 }),
      apiFetch('/users.php', { signal: controller.signal, cacheTtl: 0 }),
    ]).then(([schedules, students]) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(schedules) || !Array.isArray(students)) throw new Error('Unable to load your schedules and students.');
      setData({ schedules: schedules.filter(row => row.facultyId != null && String(row.facultyId) === String(session?.userId))
        .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)), students });
    }).catch(error => { if (!controller.signal.aborted) setScheduleError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSchedules(false); });
    return () => controller.abort();
  }, [session?.userId, reload]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLogs([]);
    setOverrides({});
    setAttendanceError('');
    setLoading(false);
    if (!scheduleId || !validDate) return () => controller.abort();
    setLoading(true);
    const stop = startPolling(async () => {
      try {
        const records = await fetchAttendanceRange(apiFetch, date, date, controller.signal, { cacheTtl: 0 });
        if (controller.signal.aborted) return;
        setLogs(records);
        setAttendanceError('');
      } catch (error) {
        if (!controller.signal.aborted) setAttendanceError(error.message);
        throw error;
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, { repeat: date === today });
    return () => { controller.abort(); stop(); };
  }, [scheduleId, date, validDate, reload, today]);

  function changeContext(callback) {
    setOverrides({});
    setSearch('');
    callback();
  }
  const visible = roster.filter(student => `${nameOf(student)} ${student.idNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const error = scheduleError || attendanceError;
  const busy = loading || loadingSchedules;

  return <div className="animate-fade-up space-y-5">
    <header className="flex items-start gap-4">
      <span className="hidden rounded-xl bg-green-100 p-3 text-green-800 sm:block"><ClipboardCheck size={26} aria-hidden="true" /></span>
      <div><p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Faculty / Attendance</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">Manual Attendance</h1>
        <p className="mt-2 text-sm text-gray-500">Review your class attendance with P, L, and A checks based on student time-ins.</p>
      </div>
    </header>

    <section className={`${card} p-5 sm:p-6`} aria-labelledby="manual-class-title">
      <h2 id="manual-class-title" className="flex items-center gap-2 font-semibold text-gray-900"><CalendarDays size={18} className="text-green-700" aria-hidden="true" />Class session</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="faculty-schedule-field"><label htmlFor="manual-schedule" className="text-sm font-medium text-gray-700">Assigned schedule</label>
          <select id="manual-schedule" className="form-input mt-2 w-full text-sm" value={scheduleId} disabled={loadingSchedules}
            onChange={event => changeContext(() => setScheduleId(event.target.value))}>
            <option value="">{loadingSchedules ? 'Loading schedules...' : 'Choose your class schedule'}</option>
            {data.schedules.map(row => <option key={row.id} value={String(row.id)}>{row.subjectCode} — {row.subjectName}</option>)}
          </select>
        </div>
        <div><label htmlFor="manual-date" className="text-sm font-medium text-gray-700">Attendance date</label>
          <input id="manual-date" type="date" max={today} value={date} onChange={event => changeContext(() => setDate(event.target.value))} className="form-input mt-2 w-full text-sm" />
        </div>
      </div>
      {selected && <dl className="mt-5 grid gap-5 rounded-lg border border-green-100 bg-green-50/60 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Time Schedule', value: `${attendanceTime(selected.startTime)} – ${attendanceTime(selected.endTime)}` },
          { label: 'Day Schedule', value: selected.days.join(', ') },
          { label: 'Year & Section', value: `${selected.yearLevel} · Section ${selected.section}` },
          { label: 'Semester', value: selected.semester },
        ].map(detail => <div key={detail.label}>
          <dt className="text-xs font-medium text-gray-500">{detail.label}</dt>
          <dd className="mt-2 text-sm font-semibold text-green-900">{detail.value || '—'}</dd>
        </div>)}
      </dl>}
      {selected && !validDate && <p role="alert" className="mt-3 text-sm text-amber-700">Choose a date today or earlier on a scheduled class day: {selected.days.join(', ')}.</p>}
      {!loadingSchedules && !error && !data.schedules.length && <p className="mt-4 text-sm text-gray-500">No schedules assigned. Your classes will appear once an administrator assigns them to you.</p>}
    </section>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
      {error}<button type="button" onClick={() => changeContext(() => setReload(value => value + 1))} className="ml-3 font-semibold underline">Retry loading</button>
    </div>}

    <div className="grid grid-cols-3 gap-3">
      {statuses.map(status => <div key={status.code} className={`${card} px-4 py-4 sm:px-5`}>
        <p className={`text-xs font-semibold sm:text-sm ${status.color}`}>{status.value}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{busy || error ? '—' : roster.filter(student => marks[student.id] === status.value).length}</p>
        {window && <p className="mt-2 text-xs text-gray-500">{status.code === 'P' ? window.presentLabel : status.code === 'L' ? window.lateLabel : 'No time-in within the class schedule'}</p>}
      </div>)}
    </div>

    {isFullscreen ? createPortal(
      <dialog ref={dialogRef} aria-labelledby="manual-roster-title" onCancel={() => setIsFullscreen(false)}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-white p-0">
        {renderStudentAttendance()}
      </dialog>, document.body,
    ) : renderStudentAttendance()}
  </div>;

  function renderStudentAttendance() {
    return <section className={isFullscreen ? 'flex h-full min-h-0 flex-col overflow-hidden bg-white' : `${card} overflow-hidden`} aria-labelledby="manual-roster-title">
      <div className="flex shrink-0 flex-col justify-between gap-4 border-b border-gray-100 bg-white p-5 sm:px-6 lg:flex-row lg:items-center">
        <div><h2 id="manual-roster-title" className="flex items-center gap-2 font-semibold text-gray-900"><Users size={18} className="text-green-700" aria-hidden="true" />Student attendance <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{roster.length}</span></h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {roster.length > 0 && <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5"><Search size={16} className="text-gray-400" aria-hidden="true" /><span className="sr-only">Search students</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or ID" className="w-40 bg-transparent text-sm outline-none sm:w-44" /></label>}
          <button type="button" disabled={busy} onClick={() => changeContext(() => setReload(value => value + 1))} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} aria-hidden="true" />Refresh checks</button>
          <button ref={isFullscreen ? undefined : maximizeRef} type="button" onClick={() => setIsFullscreen(value => !value)}
            aria-label={isFullscreen ? 'Close fullscreen student attendance' : 'Maximize student attendance'}
            title={isFullscreen ? 'Close fullscreen' : 'Maximize'}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2.5 text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
            {isFullscreen ? <X size={20} aria-hidden="true" /> : <Maximize2 size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className={isFullscreen ? 'min-h-0 flex-1 overflow-auto overscroll-contain' : undefined}
        style={isFullscreen ? { scrollbarGutter: 'stable' } : undefined}
        role={isFullscreen ? 'region' : undefined} aria-label={isFullscreen ? 'Scrollable student attendance' : undefined}
        tabIndex={isFullscreen ? 0 : undefined}>
      {busy ? <div role="status" className="px-6 py-16 text-center text-sm text-gray-500">Loading class attendance...</div>
        : error ? <p className="px-6 py-16 text-center text-sm text-gray-500">Attendance could not be loaded. Retry to view the current checks.</p>
        : !roster.length ? <div className="px-6 py-16 text-center"><ClipboardCheck size={32} className="mx-auto mb-3 text-gray-300" aria-hidden="true" /><p className="font-medium text-gray-700">{selected && validDate ? 'No students to display' : 'Choose a class session'}</p><p className="mt-2 text-sm text-gray-500">{selected && validDate ? 'Active students assigned to this year and section will appear here.' : 'Select an assigned schedule and a valid class date to begin.'}</p></div>
        : <div className={isFullscreen ? undefined : 'overflow-x-auto'}><table className="w-full min-w-[580px] text-left text-sm">
          <caption className="sr-only">Attendance for {selected?.subjectCode} on {date}. P: Present, L: Late, A: Absent.</caption>
          <thead className={`${isFullscreen ? 'sticky top-0 z-10 shadow-sm ' : ''}border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500`}><tr>
            <th scope="col" className="w-14 px-5 py-4">No.</th><th scope="col" className="px-5 py-4">Student</th><th scope="col" className="px-5 py-4">ID number</th>
            {statuses.map(status => <th key={status.code} scope="col" className={`w-20 px-3 py-4 text-center ${status.color}`} title={status.value}>{status.code}<span className="sr-only"> — {status.value}</span></th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">{visible.map(student => <tr key={student.id} className="hover:bg-gray-50/60">
            <td className="px-5 py-4 text-gray-400">{String(roster.indexOf(student) + 1).padStart(2, '0')}</td>
            <th scope="row" className="px-5 py-4 font-medium text-gray-900">{nameOf(student)}</th><td className="px-5 py-4 text-gray-500">{student.idNumber || '—'}</td>
            {statuses.map(status => <td key={status.code} className="px-3 py-3 text-center"><label className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition ${marks[student.id] === status.value ? status.bg : 'hover:bg-gray-100'}`}>
              <input type="checkbox" checked={marks[student.id] === status.value} onChange={() => setOverrides(previous => ({ ...previous, [student.id]: status.value }))} aria-label={`${status.value} for ${nameOf(student)}`} className={`h-5 w-5 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-4 ${status.accent}`} />
            </label></td>)}
          </tr>)}</tbody>
        </table>{!visible.length && <p className="px-6 py-10 text-center text-sm text-gray-500">No students match your search.</p>}</div>}
      </div>
    </section>;
  }
}
