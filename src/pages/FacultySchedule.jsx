import React from 'react';
import { BookOpenText, CalendarDays, Clock, GraduationCap, RefreshCw, Search, Users } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../state/AuthContext';
import { attendanceTime, studentSection } from '../utils/attendance';

const fullName = student => [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');

export default function FacultySchedule() {
  const { session } = useAuth();
  const [data, setData] = React.useState({ schedules: [], students: [] });
  const [selectedId, setSelectedId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    async function load() {
      try {
        const options = { signal: controller.signal, ...(refresh ? { cacheTtl: 0 } : {}) };
        const [schedules, users] = await Promise.all([
          apiFetch('/class-schedules.php', options),
          apiFetch('/users.php', options),
        ]);
        if (controller.signal.aborted) return;
        if (!Array.isArray(schedules) || !Array.isArray(users)) throw new Error('Unable to read class information. Please try again.');
        setData({
          schedules: schedules.filter(row => row.facultyId != null && String(row.facultyId) === String(session?.userId))
            .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode) || a.yearLevel.localeCompare(b.yearLevel) || a.section.localeCompare(b.section)),
          students: users.filter(user => user.role === 'student' && user.status === 'Active'),
        });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Unable to load your schedules. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [session?.userId, refresh]);

  const selected = data.schedules.find(row => String(row.id) === selectedId);
  const roster = React.useMemo(() => selected ? data.students.filter(student => {
    const section = studentSection(student);
    return section?.yearLevel === selected.yearLevel && section?.section === selected.section;
  }).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || fullName(a).localeCompare(fullName(b))) : [], [selected, data.students]);
  const term = search.trim().toLowerCase();
  const visibleStudents = roster.filter(student => [fullName(student), student.idNumber, student.email].some(value => String(value || '').toLowerCase().includes(term)));
  const sectionCount = new Set(data.schedules.map(row => `${row.yearLevel}|${row.section}`)).size;

  return (
    <div className="animate-fade-up space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Faculty / Class management</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">My Schedule</h1>
          <p className="mt-2 text-sm text-gray-500">Choose one of your assigned classes to view its schedule and students.</p>
        </div>
        <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh
        </button>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-3 font-semibold underline">Try again</button>
      </div> : loading ? <div role="status" className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
        <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-green-700" aria-hidden="true" />Loading your schedules and students…
      </div> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Assigned schedules', value: data.schedules.length, Icon: CalendarDays },
            { label: 'Class sections', value: sectionCount, Icon: GraduationCap },
            { label: 'Students in selected class', value: selected ? roster.length : '—', Icon: Users },
          ].map(({ label, value, Icon }) => <div key={label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="rounded-xl bg-green-50 p-3 text-green-700"><Icon size={22} aria-hidden="true" /></span>
            <div><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p></div>
          </div>)}
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="schedule-selection-title">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 id="schedule-selection-title" className="font-semibold text-gray-900">Select a schedule</h2>
            <p className="mt-1 text-sm text-gray-500">Your assigned subjects, sections, and semesters.</p>
          </div>
          {data.schedules.length ? <div className="p-5 sm:p-6">
            <div className="faculty-schedule-field">
            <label htmlFor="faculty-schedule" className="block text-sm font-medium text-gray-700">Class schedule</label>
            <select id="faculty-schedule" value={selected ? selectedId : ''} onChange={event => { setSelectedId(event.target.value); setSearch(''); }}
              className="form-input mt-2 w-full text-sm">
              <option value="">Choose a schedule</option>
              {data.schedules.map(row => <option key={row.id} value={String(row.id)}>
                {row.subjectCode} — {row.subjectName}
              </option>)}
            </select>
            </div>
            {selected && <div className="mt-5 rounded-xl border border-green-100 bg-green-50/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-semibold text-white">{selected.subjectCode}</span>
                <h3 className="font-semibold text-gray-900">{selected.subjectName}</h3>
              </div>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Year & section', value: `${selected.yearLevel} · Section ${selected.section}`, Icon: GraduationCap },
                  { label: 'Semester', value: selected.semester, Icon: BookOpenText },
                  { label: 'Class days', value: (selected.days || []).join(', ') || 'No days assigned', Icon: CalendarDays },
                  { label: 'Class time', value: `${attendanceTime(selected.startTime)} – ${attendanceTime(selected.endTime)}`, Icon: Clock },
                ].map(({ label, value, Icon }) => <div key={label}>
                  <dt className="flex items-center gap-2 text-xs font-medium text-gray-500"><Icon size={14} aria-hidden="true" />{label}</dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-800">{value || '—'}</dd>
                </div>)}
              </dl>
            </div>}
          </div> : <div className="px-6 py-12 text-center">
            <CalendarDays className="mx-auto mb-3 text-gray-400" size={32} aria-hidden="true" />
            <h3 className="font-semibold text-gray-900">No schedules assigned yet</h3>
            <p className="mt-2 text-sm text-gray-500">Your classes will appear here when an administrator assigns a schedule to you.</p>
          </div>}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="student-roster-title">
          <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 id="student-roster-title" className="flex items-center gap-2 font-semibold text-gray-900">Students
                {selected && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">{roster.length}</span>}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{selected ? `Active students in ${selected.yearLevel}, Section ${selected.section}.` : 'Select a schedule above to view your students.'}</p>
            </div>
            {selected && <div className="w-full shrink-0 sm:w-80">
              <label htmlFor="roster-search" className="sr-only">Search students by name, ID, or email</label>
              <div className="form-input faculty-student-search flex items-center gap-2.5">
              <Search size={16} className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <input id="roster-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, ID, or email…"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-800 outline-none placeholder:text-gray-400" />
              </div>
            </div>}
          </div>
          {selected && visibleStudents.length ? <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Students for {selected.subjectCode}, {selected.yearLevel}, Section {selected.section}</caption>
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr><th scope="col" className="w-16 px-6 py-3.5">No.</th><th scope="col" className="px-6 py-3.5">Student</th><th scope="col" className="px-6 py-3.5">Student ID</th><th scope="col" className="px-6 py-3.5">Email address</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleStudents.map((student, index) => <tr key={student.id} className="transition hover:bg-gray-50/70">
                    <td className="px-6 py-4 tabular-nums text-gray-400">{String(index + 1).padStart(2, '0')}</td>
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-semibold text-green-700" aria-hidden="true">{student.firstName?.[0]}{student.lastName?.[0]}</span>{fullName(student) || 'Unnamed student'}</div>
                    </th>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">{student.idNumber || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{student.email || '—'}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500" role="status">Showing {visibleStudents.length} of {roster.length} students</p>
          </> : <div className="px-6 py-14 text-center" role="status">
            <Users className="mx-auto mb-3 text-gray-300" size={36} aria-hidden="true" />
            <h3 className="font-semibold text-gray-800">{!selected ? 'Choose your class to get started' : roster.length ? 'No matching students' : 'No students in this class yet'}</h3>
            <p className="mt-2 text-sm text-gray-500">{!selected ? 'Students will appear here after you select a schedule.' : roster.length ? 'Try a different name, student ID, or email address.' : 'Students will appear when active accounts are assigned to this year level and section.'}</p>
            {selected && roster.length > 0 && <button type="button" onClick={() => setSearch('')} className="mt-4 text-sm font-semibold text-green-700 hover:underline">Clear search</button>}
          </div>}
        </section>
      </>}
    </div>
  );
}
