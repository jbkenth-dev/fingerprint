import React from 'react';
import { Download, FileBarChart, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../state/AuthContext';
import { attendanceTime, attendanceWindow, datesInRange, fetchAttendanceRange, manilaNow } from '../utils/attendance';
import { buildAttendanceReport, formatReportDays, formatReportSemester } from '../utils/attendanceReport';

const generatedLabel = date => new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
}).format(date);
const inputClass = 'form-input mt-2 w-full rounded-lg px-3 py-2.5 text-sm disabled:opacity-50';

export default function AdminReports() {
  const { session } = useAuth();
  const isFaculty = session?.role === 'faculty';
  const [schedules, setSchedules] = React.useState([]);
  const [scheduleLoading, setScheduleLoading] = React.useState(true);
  const [scheduleError, setScheduleError] = React.useState('');
  const [year, setYear] = React.useState('');
  const [section, setSection] = React.useState('');
  const [scheduleId, setScheduleId] = React.useState('');
  const [start, setStart] = React.useState(() => manilaNow().date);
  const [end, setEnd] = React.useState(() => manilaNow().date);
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [downloading, setDownloading] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setScheduleLoading(true);
      setScheduleError('');
      try {
        const data = await apiFetch('/class-schedules.php', { signal: controller.signal });
        if (!Array.isArray(data)) throw new Error('Unable to read class schedules.');
        if (controller.signal.aborted) return;
        setSchedules(isFaculty
          ? data.filter(row => row.facultyId != null && String(row.facultyId) === String(session?.userId))
          : data);
      } catch (err) {
        if (!controller.signal.aborted) setScheduleError(err.message || 'Unable to load class schedules.');
      } finally {
        if (!controller.signal.aborted) setScheduleLoading(false);
      }
    }
    load();
    window.addEventListener('api:recovered', load);
    return () => { controller.abort(); window.removeEventListener('api:recovered', load); };
  }, [revision, isFaculty, session?.userId]);

  const years = [...new Set(schedules.map(row => row.yearLevel))].sort();
  const sections = [...new Set(schedules.filter(row => row.yearLevel === year).map(row => row.section))].sort();
  const options = isFaculty ? schedules : schedules.filter(row => row.yearLevel === year && row.section === section);
  const schedule = options.find(row => String(row.id) === scheduleId);
  const rangeError = !start || !end ? 'Select both dates.'
    : !datesInRange(start, end).length ? 'Select a valid range with the end date on or after the start date.'
    : end > manilaNow().date ? 'Select dates up to today.' : '';
  const selectionKey = JSON.stringify([year, section, scheduleId, start, end]);
  const currentReport = report?.selectionKey === selectionKey && !rangeError && schedule ? report : null;

  React.useEffect(() => {
    setPage(1);
    setReport(null);
    setError('');
    setLoading(false);
    if (!schedule || rangeError || scheduleLoading || scheduleError) return;
    const controller = new AbortController();
    async function compute() {
      setLoading(true);
      try {
        // Fetch a real roster; never calculate a report from bundled demo users.
        const [logs, users] = await Promise.all([
          fetchAttendanceRange(apiFetch, start, end, controller.signal, { cacheTtl: 0 }),
          apiFetch('/users.php', { signal: controller.signal, cacheTtl: 0 }),
        ]);
        if (controller.signal.aborted) return;
        if (!Array.isArray(users)) throw new Error('Unable to read the student roster.');
        if (!attendanceWindow(schedule)) throw new Error('This schedule has invalid class times. Update the schedule before generating a report.');
        const faculty = users.find(user => String(user.id) === String(schedule.facultyId));
        const facultyName = faculty
          ? [faculty.firstName, faculty.middleName, faculty.lastName].filter(Boolean).join(' ')
          : schedule.facultyName || 'No faculty assigned';
        setReport({ ...buildAttendanceReport(logs, users, schedule, start, end), facultyName, selectionKey });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Unable to compute attendance.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = setTimeout(compute, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [schedule, selectionKey, rangeError, scheduleLoading, scheduleError, revision, start, end]);

  async function download() {
    if (!currentReport || loading || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const { createAttendancePdf } = await import('../utils/attendancePdf');
      const doc = createAttendancePdf(currentReport);
      const safeCode = String(currentReport.schedule.subjectCode || 'class').replace(/[^a-z0-9_-]/gi, '-');
      await doc.save(`attendance-report-${safeCode}-${start}-to-${end}.pdf`, { returnPromise: true });
    } catch (err) {
      setError(err.message || 'Unable to download the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil((currentReport?.rows.length || 0) / 20));
  const visibleRows = currentReport?.rows.slice((page - 1) * 20, page * 20) || [];
  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{isFaculty ? 'Faculty' : 'Administration'} / Reports</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">Attendance reports</h1>
          <p className="mt-2 text-sm text-gray-500">Review class attendance for a selected period and download a formal PDF report.</p>
        </div>
        <button type="button" onClick={download} disabled={!currentReport || loading || downloading || scheduleLoading || !!scheduleError}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
          <Download size={17} aria-hidden="true" />{downloading ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </header>

      <section className="card-elevated p-5 sm:p-6" aria-label="Report filters">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-gray-900">Report parameters</h2><p className="mt-1 text-sm text-gray-500">Choose a class and an inclusive date range.</p></div>
          <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading || scheduleLoading}
            className="btn btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-40"><RefreshCw size={15} aria-hidden="true" />Refresh</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!isFaculty && <><label className="text-sm font-medium text-gray-700">Year level
            <select className={inputClass} value={year} disabled={scheduleLoading} onChange={event => {
              setYear(event.target.value); setSection(''); setScheduleId('');
            }}><option value="">Select year level</option>{years.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-gray-700">Section
            <select className={inputClass} value={section} disabled={!year || scheduleLoading} onChange={event => {
              setSection(event.target.value); setScheduleId('');
            }}><option value="">Select section</option>{sections.map(value => <option key={value} value={value}>Section {value}</option>)}</select>
          </label>
          </>}
          <label className={`text-sm font-medium text-gray-700 ${isFaculty ? '' : 'sm:col-span-2 lg:col-span-1'}`}>Class schedule
            <select className={inputClass} value={schedule ? scheduleId : ''} disabled={(!isFaculty && !section) || scheduleLoading} onChange={event => setScheduleId(event.target.value)}>
              <option value="">Select schedule</option>{options.map(row => <option key={row.id} value={row.id}>
                {row.subjectCode} — {row.subjectName}
                {isFaculty ? ` — ${row.yearLevel}, Section ${row.section} (${formatReportSemester(row.semester)})` : ''}
              </option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Start date
            <input className={inputClass} type="date" max={manilaNow().date} value={start} onChange={event => setStart(event.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-700">End date
            <input className={inputClass} type="date" min={start || undefined} max={manilaNow().date} value={end} onChange={event => setEnd(event.target.value)} />
          </label>
        </div>
        {(rangeError || scheduleError || error) && <p role="alert" className="mt-4 text-sm text-red-700">{rangeError || scheduleError || error}</p>}
        {!scheduleLoading && !scheduleError && !schedules.length && <p className="mt-4 text-sm text-gray-500">{isFaculty ? 'No classes are assigned to you yet. Contact an administrator to assign your schedules.' : 'Create a class schedule to prepare an attendance report.'}</p>}
      </section>

      {!currentReport ? <section className="card-elevated px-6 py-16 text-center" aria-live="polite">
        <FileBarChart size={30} className="mx-auto text-gray-400" aria-hidden="true" />
        <h2 className="mt-4 font-semibold text-gray-900">{loading || scheduleLoading ? 'Preparing report…' : 'Your report preview'}</h2>
        <p className="mt-2 text-sm text-gray-500">{loading ? 'Computing attendance for the selected class and dates.' : isFaculty ? 'Select a class schedule and valid dates to see attendance totals.' : 'Select a year level, section, schedule, and valid dates to see attendance totals.'}</p>
      </section> : <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Attendance report preview">
        <div className="border-b border-gray-200 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Francis Key · Attendance Management</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">Class attendance summary</h2>
          <p className="mt-2 text-sm text-gray-600">{start} — {end}</p>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Subject', `${schedule.subjectCode} — ${schedule.subjectName}`],
              ['Class', `${schedule.yearLevel} · Section ${schedule.section}`],
              ['Semester', formatReportSemester(schedule.semester)],
              ['Faculty', currentReport.facultyName],
              ['Schedule', `${formatReportDays(schedule.days)} | ${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}`],
              ['Coverage', `${currentReport.classDates.length} scheduled dates · ${currentReport.rows.length} active students`],
              ['Computed at', generatedLabel(currentReport.generatedAt)],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1.5 break-words font-medium text-gray-900">{value}</dd></div>)}
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-px border-b border-gray-200 bg-gray-200 sm:grid-cols-4" aria-live="polite">
          {['present', 'late', 'absent', 'total'].map(key => <div key={key} className="bg-white p-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key === 'total' ? 'Total Days' : key}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{currentReport.totals[key]}</p>
          </div>)}
        </div>
        <div className="p-6 sm:p-8">
          <h3 className="font-semibold text-gray-900">Student attendance breakdown</h3>
          {!currentReport.classDates.length && <p className="mt-3 text-sm text-gray-600">No scheduled class dates fall within this range.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <caption className="sr-only">Attendance counts per student for the selected date range</caption>
              <thead className="border-y border-gray-900 text-xs text-gray-900"><tr>
                {['No.', 'Student ID', 'Student name', 'Present', 'Late', 'Absent', 'Total Days'].map((label, index) => <th scope="col" key={label} className={`px-3 py-3 font-semibold ${index > 2 ? 'text-right' : 'text-left'}`}>{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((row, index) => <tr key={row.userId}>
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * 20 + index + 1}</td>
                  <td className="px-3 py-3 text-gray-600">{row.idNumber}</td><td className="px-3 py-3 font-medium text-gray-900">{row.name}</td>
                  {['present', 'late', 'absent', 'total'].map(key => <td key={key} className={`px-3 py-3 text-right tabular-nums text-gray-900 ${key === 'total' ? 'font-semibold' : ''}`}>{row[key]}</td>)}
                </tr>)}
                {!visibleRows.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No active students in the selected class.</td></tr>}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-600">
            <span>Page {page} of {pageCount}</span><div className="flex gap-2">
              <button className="btn btn-secondary disabled:opacity-40" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
              <button className="btn btn-secondary disabled:opacity-40" disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Next</button>
            </div>
          </div>}
        </div>
      </section>}
    </div>
  );
}
