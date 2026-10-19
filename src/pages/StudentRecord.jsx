import React from 'react';
import { BookOpenText, CalendarDays, Download, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { useAuth } from '../state/AuthContext';
import { useManilaClock } from '../hooks/useManilaClock';
import { apiFetch } from '../api';
import { useStudentSchedules } from '../state/StudentScheduleContext';
import { attendanceTime, datesInRange, fetchAttendanceRange, manilaNow, studentSection, timeMinutes } from '../utils/attendance';
import { buildAttendanceReport } from '../utils/attendanceReport';

export default function StudentRecord() {
  const { currentUser } = useAuth();
  useManilaClock();
  const { date: today, minutes } = manilaNow();
  const [semester, setSemester] = React.useState('');
  const { schedules, loading: scheduleLoading, error: scheduleError, refresh: refreshSchedules } = useStudentSchedules();
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [period, setPeriod] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadedKey, setLoadedKey] = React.useState('');
  const [refresh, setRefresh] = React.useState(0);
  const section = React.useMemo(() => studentSection(currentUser || {}), [currentUser]);
  const periodKey = period ? `${semester}:${period.start}:${period.end}:${refresh}` : '';
  const validRange = Boolean(start && end && start <= end && end <= today && datesInRange(start, end).length);
  const editingRange = period && (start !== period.start || end !== period.end);

  React.useEffect(() => {
    if (!period || !semester) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setLoadedKey('');
    fetchAttendanceRange(apiFetch, period.start, period.end, controller.signal, refresh ? { cacheTtl: 0 } : {})
      .then(records => {
        if (!controller.signal.aborted) { setLogs(records); setLoadedKey(periodKey); }
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Unable to load attendance records.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, semester, periodKey, refresh]);

  const ready = Boolean(period && loadedKey === periodKey && !loading && !error && !editingRange);
  const rows = React.useMemo(() => {
    const selected = schedules.filter(schedule => section && schedule.yearLevel === section.yearLevel &&
      schedule.section === section.section && schedule.semester === semester)
      .sort((a, b) => (timeMinutes(a.startTime) ?? 0) - (timeMinutes(b.startTime) ?? 0) || String(a.subjectCode).localeCompare(String(b.subjectCode)));
    const ownLogs = logs.filter(log => String(log.userId) === String(currentUser?.id));
    return selected.map(schedule => ({ ...schedule, totals: ready ? buildAttendanceReport(ownLogs, currentUser ? [currentUser] : [], schedule, period.start, period.end).totals : null }));
  }, [schedules, section, semester, logs, currentUser, ready, period, today, minutes]);

  const handleDownloadPdf = () => {
    if (!ready || !rows.length || !period) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 14;
    const generated = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date());
    doc.setProperties({ title: 'Student Attendance Record', subject: `${semester} | ${period.start} to ${period.end}` });
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Student Attendance Record', margin, 18);
    doc.setFontSize(9);
    doc.text('Student', margin, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(String(currentUser?.name || [currentUser?.firstName, currentUser?.middleName, currentUser?.lastName].filter(Boolean).join(' ') || 'Student'), 36, 30, { maxWidth: 92 });
    doc.setFont('helvetica', 'bold');
    doc.text('ID Number', 150, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(String(currentUser?.idNumber || 'N/A'), 172, 30, { maxWidth: 105 });
    doc.setFont('helvetica', 'bold');
    doc.text('Class', margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(section ? `${section.yearLevel} - Section ${section.section}` : 'N/A', 36, 38, { maxWidth: 92 });
    doc.setFont('helvetica', 'bold');
    doc.text('Semester', 150, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(semester, 172, 38, { maxWidth: 105 });
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance period', margin, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(`${period.start} to ${period.end}`, 48, 46, { maxWidth: 90 });
    doc.setFont('helvetica', 'bold');
    doc.text('Generated', 150, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(generated, 172, 46, { maxWidth: 105 });

    autoTable(doc, {
      startY: 54,
      margin: { left: margin, right: margin, top: 14, bottom: 18 },
      head: [['Subject', 'Day', 'Time', 'Faculty', 'Present', 'Late', 'Absent', 'Total Days']],
      body: rows.map(row => [
        `${row.subjectCode || ''}${row.subjectCode ? ' - ' : ''}${row.subjectName || ''}`,
        row.days?.join(', ') || 'N/A',
        `${attendanceTime(row.startTime)} - ${attendanceTime(row.endTime)}`,
        row.facultyName || 'No instructor assigned',
        row.totals?.present ?? 0,
        row.totals?.late ?? 0,
        row.totals?.absent ?? 0,
        row.totals?.total ?? 0,
      ]),
      theme: 'grid',
      tableWidth: 269,
      styles: { font: 'helvetica', fontSize: 9, textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.2, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle', minCellHeight: 10 },
      headStyles: { fontStyle: 'bold', textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.3, halign: 'center', minCellHeight: 12 },
      alternateRowStyles: { fillColor: 255 },
      columnStyles: {
        0: { cellWidth: 57 }, 1: { cellWidth: 33 }, 2: { cellWidth: 41 }, 3: { cellWidth: 55 },
        4: { cellWidth: 19, halign: 'center', fontStyle: 'bold' }, 5: { cellWidth: 19, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 19, halign: 'center', fontStyle: 'bold' }, 7: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      },
      rowPageBreak: 'avoid',
      didDrawPage: ({ pageNumber, pageCount }) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.line(margin, 195, 297 - margin, 195);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text('Student Attendance Record', margin, 201);
        doc.text(`Page ${pageNumber} of ${pageCount}`, 297 - margin, 201, { align: 'right' });
      },
    });
    doc.save(`student-attendance-record-${period.start}-to-${period.end}.pdf`);
  };

  return <div className="animate-fade-up space-y-6">
    <header className="rounded-2xl border border-green-800 bg-green-900 p-5 text-white sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-green-200">Semester overview</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Record</h1>
      <p className="mt-2 text-sm text-green-100">View your subjects and attendance totals for the semester.</p>
      {section && <p className="mt-4 text-xs text-green-100">{section.yearLevel} &middot; Section {section.section}</p>}
    </header>
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <label htmlFor="record-semester" className="mb-2 block text-sm font-semibold text-gray-800">Select semester</label>
      <select id="record-semester" value={semester} onChange={event => { setSemester(event.target.value); setPeriod(null); setLogs([]); setLoadedKey(''); setError(''); setLoading(false); }} className="form-input w-full rounded-lg px-3 py-2.5 text-sm sm:max-w-xs">
        <option value="">Choose a semester</option><option value="1st Sem">1st Semester</option><option value="2nd Sem">2nd Semester</option>
      </select>
      {semester && <form className="mt-5 border-t border-gray-100 pt-5" onSubmit={event => { event.preventDefault(); if (validRange) { setPeriod({ start, end }); setRefresh(value => value + 1); } }}>
        <p className="text-sm font-medium text-gray-800">Attendance period</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div><label htmlFor="record-start" className="mb-1.5 block text-xs font-medium text-gray-600">From</label><input id="record-start" type="date" required value={start} max={end || today} onChange={event => setStart(event.target.value)} className="form-input rounded-lg px-3 py-2 text-sm" /></div>
          <div><label htmlFor="record-end" className="mb-1.5 block text-xs font-medium text-gray-600">Through</label><input id="record-end" type="date" required value={end} min={start || undefined} max={today} onChange={event => setEnd(event.target.value)} className="form-input rounded-lg px-3 py-2 text-sm" /></div>
          <button type="submit" disabled={!validRange || loading} className="btn btn-primary text-sm disabled:opacity-50">{loading ? 'Loading totals...' : 'Show totals'}</button>
        </div>
      </form>}
    </section>
    {!semester ? <section className="rounded-2xl border border-gray-200 bg-white p-12 text-center"><CalendarDays size={30} className="mx-auto text-green-600" /><h2 className="mt-4 font-semibold text-gray-800">Choose a semester to get started</h2><p className="mt-2 text-sm text-gray-500">Your subjects, schedules, faculty, and attendance totals will appear here.</p></section>
      : <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div><h2 className="font-semibold text-gray-900">{semester === '1st Sem' ? '1st' : '2nd'} Semester subjects</h2><p className="mt-1 text-xs text-gray-500">{ready ? `Attendance totals: ${period.start} to ${period.end}` : 'Select an attendance period to calculate totals.'}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleDownloadPdf} disabled={!ready || !rows.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"><Download size={14} />Download PDF</button>
            <button type="button" onClick={() => { refreshSchedules(); setRefresh(value => value + 1); }} disabled={loading || scheduleLoading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:opacity-50"><RefreshCw size={14} className={loading || scheduleLoading ? 'animate-spin' : ''} />Refresh</button>
          </div>
        </div>
        {(scheduleError || error) && <div role="alert" className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{scheduleError || error}</div>}
        {scheduleLoading ? <p role="status" className="p-10 text-center text-sm text-gray-500">Loading subjects...</p>
          : !rows.length ? <div className="p-12 text-center"><BookOpenText size={28} className="mx-auto text-green-600" /><p className="mt-4 text-sm text-gray-500">{!section ? 'Ask an administrator to add your year and section to your profile.' : 'No subjects scheduled for this semester.'}</p></div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500"><tr>{['Subject', 'Day', 'Time', 'Faculty', 'Present', 'Late', 'Absent', 'Total Days'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{rows.map(row => <tr key={row.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-4"><p className="text-xs text-gray-500">{row.subjectCode}</p><p className="mt-1 font-semibold text-gray-900">{row.subjectName}</p></td>
              <td className="px-4 py-4 text-xs text-gray-600">{row.days?.join(', ') || '--'}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs tabular-nums text-gray-700">{attendanceTime(row.startTime)} &ndash; {attendanceTime(row.endTime)}</td>
              <td className="px-4 py-4 text-xs text-gray-600">{row.facultyName || 'No instructor assigned'}</td>
              {['present', 'late', 'absent', 'total'].map((key, index) => <td key={key} className={`px-4 py-4 font-semibold tabular-nums ${['text-green-700', 'text-amber-600', 'text-red-600', 'text-gray-900'][index]}`}>{row.totals ? row.totals[key] : '--'}</td>)}
            </tr>)}</tbody>
          </table></div>}
      </section>}
  </div>;
}
