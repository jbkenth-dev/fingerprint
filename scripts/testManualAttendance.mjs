import test from 'node:test';
import assert from 'node:assert/strict';
import { manualAttendanceRows } from '../src/utils/manualAttendance.js';
import { attendanceSessions, classifyAttendance, fetchAttendanceRange, liveAttendance } from '../src/utils/attendance.js';

const date = '2026-10-12';
const schedule = { id: 10, yearLevel: '1st Year', section: 'A', days: ['Monday'], startTime: '08:00:00', endTime: '09:00:00' };
const students = [{ id: 1, role: 'student', status: 'Active', department: 'BSIT 1-A' }];
const scan = (logTime, extra = {}) => ({ id: 1, userId: 1, logDate: date, logTime, status: 'IN', ...extra });
const rows = logs => manualAttendanceRows(logs, students, schedule, date);

test('loads manual checks through the unchanged attendance API without extra records or metadata requests', async () => {
  const manual = scan('08:16:00', { id: 1, source: 'faculty-manual:10:IN' });
  const calls = [];
  const fetcher = async path => {
    calls.push(path);
    return { records: [manual], total: 1 };
  };
  const loaded = await fetchAttendanceRange(fetcher, date, date);
  assert.equal(calls.length, 1);
  assert.equal(loaded.length, 1);
  assert.equal(rows(loaded)[0].attendanceStatus, 'Late');
  assert.equal(loaded[0].id, 1);
});

test('saved checkbox changes take priority over scans and stay isolated to their class', () => {
  const secondClass = { ...schedule, id: 20, subjectCode: 'SECOND' };
  const original = scan('08:00:00');
  // Covers P -> L -> A -> P -> A -> L -> P using the same saved record.
  for (const status of ['Present', 'Late', 'Absent', 'Present', 'Absent', 'Late', 'Present']) {
    const saved = scan(status === 'Present' ? '08:00:00' : status === 'Late' ? '08:16:00' : '00:00:00', {
      id: 2, status: status === 'Absent' ? 'ABSENT' : 'IN', source: 'faculty-manual', localRecordId: `manual:10:1:${date}`,
    });
    const out = scan('09:00:00', { id: 3, status: 'OUT', source: 'faculty-manual', localRecordId: `manual:10:1:${date}:out` });
    const logs = [original, saved, ...(status === 'Absent' ? [] : [out])];
    assert.equal(rows(logs)[0].attendanceStatus, status);
    assert.equal(rows(logs)[0].timeOut, status === 'Absent' ? '—' : '9:00 AM');
    assert.equal(manualAttendanceRows(logs, students, secondClass, date)[0].attendanceStatus, 'Present');
    const classified = classifyAttendance(logs, students, [schedule, secondClass], date, date, new Date('2026-10-12T00:05:00Z'));
    assert.equal(classified[status.toLowerCase()].find(row => row.scheduleId === 10).status, status);
    assert.equal(classified[status.toLowerCase()].find(row => row.scheduleId === 10).timeOut, status === 'Absent' ? '' : '9:00 AM');
    assert.equal(Object.values(classified).flat().length, 2);
    const live = liveAttendance(logs, students, [schedule], date);
    assert.equal(live.length, 1);
    assert.equal(live[0].status, status);
    assert.equal(live[0].timeOut, status === 'Absent' ? '—' : '9:00 AM');
    assert.equal(attendanceSessions(logs).length, 1);
  }
});

test('manual OUT is tied to its class and date and is independent of IN status', () => {
  const saved = scan('08:00:00', { id: 2, source: 'faculty-manual', localRecordId: `manual:10:1:${date}` });
  const out = scan('09:00:00', { id: 3, status: 'OUT', source: 'faculty-manual', localRecordId: `manual:10:1:${date}:out` });
  for (const other of [
    { ...out, localRecordId: `manual:20:1:${date}:out` },
    { ...out, logDate: '2026-10-13' }, { ...out, userId: 2 },
  ]) assert.equal(rows([saved, other])[0].timeOut, '—');
  assert.equal(rows([{ ...saved, status: 'ABSENT', logTime: '00:00:00' }, out])[0].timeOut, '9:00 AM');
});

test('IN and OUT checks persist independently even though P and L share the OUT time', () => {
  const inMark = scan('08:00:00', { id: 2, source: 'faculty-manual', localRecordId: `manual:10:1:${date}` });
  assert.equal(rows([inMark])[0].outAttendanceStatus, null);
  for (const status of ['Present', 'Late', 'Absent']) {
    const out = scan(status === 'Absent' ? '00:00:00' : '09:00:00', { id: 3, status: status === 'Absent' ? 'ABSENT' : 'OUT',
      source: `faculty-manual-out-${status.toLowerCase()}`, localRecordId: `manual:10:1:${date}:out` });
    const result = rows([inMark, out])[0];
    assert.equal(result.attendanceStatus, 'Present');
    assert.equal(result.outAttendanceStatus, status);
    assert.equal(result.timeOut, status === 'Absent' ? '—' : '9:00 AM');
    const absentIn = { ...inMark, logTime: '00:00:00', status: 'ABSENT' };
    assert.equal(rows([absentIn, out])[0].outAttendanceStatus, status);
    assert.equal(attendanceSessions([inMark, out]).length, 0);
  }
});

test('OUT checks remain unset until an OUT record exists', () => {
  for (const logs of [[], [scan('08:00:00')], [scan('08:16:00')]]) {
    assert.equal(rows(logs)[0].outAttendanceStatus, null);
  }
  const absentOut = scan('00:00:00', { status: 'ABSENT', source: 'faculty-manual:10:OUT:A' });
  assert.equal(rows([absentOut])[0].outAttendanceStatus, 'Absent');
});

test('updated device rows retain class checks when the API does not return local record IDs', () => {
  const inMark = scan('08:16:00', { id: 100, source: 'faculty-manual:10:IN' });
  const outMark = scan('09:00:00', { id: 101, status: 'OUT', source: 'faculty-manual:10:OUT:P' });
  const logs = [inMark, outMark];
  assert.equal(rows(logs)[0].attendanceStatus, 'Late');
  assert.equal(rows(logs)[0].outAttendanceStatus, 'Present');
  assert.equal(rows(logs)[0].timeOut, '9:00 AM');
  assert.equal(liveAttendance(logs, students, [schedule], date)[0].timeOut, '9:00 AM');
  assert.equal(classifyAttendance(logs, students, [schedule], date, date, new Date('2026-10-12T02:00:00Z')).late.length, 1);
  assert.equal(manualAttendanceRows(logs, students, { ...schedule, id: 20 }, date)[0].attendanceStatus, 'Absent');
});

test('editing an existing IN preserves its device OUT until OUT attendance is changed', () => {
  const logs = [scan('08:16:00', { id: 100, source: 'faculty-manual:10:IN' }), scan('09:04:00', { id: 101, status: 'OUT' })];
  assert.equal(rows(logs)[0].timeOut, '9:04 AM');
  assert.equal(rows(logs)[0].outAttendanceStatus, 'Late');
  assert.equal(liveAttendance(logs, students, [schedule], date).find(row => row.scheduleId === 10).timeOut, '9:04 AM');
});

test('OUT-only manual updates override scanner timeouts without changing scanner IN', () => {
  const logs = [scan('08:00:00'), scan('08:50:00', { id: 2, status: 'OUT' })];
  const out = scan('09:00:00', { id: 3, status: 'OUT', source: 'faculty-manual-out-late', localRecordId: `manual:10:1:${date}:out` });
  const changed = [...logs, out];
  assert.equal(rows(changed)[0].attendanceStatus, 'Present');
  assert.equal(rows(changed)[0].outAttendanceStatus, 'Late');
  assert.equal(liveAttendance(changed, students, [schedule], date)[0].timeOut, '9:00 AM');
  assert.equal(classifyAttendance(changed, students, [schedule], date, date, new Date('2026-10-12T02:00:00Z')).present[0].timeOut, '9:00 AM');
  const absent = [...logs, { ...out, status: 'ABSENT', logTime: '00:00:00', source: 'faculty-manual-out-absent' }];
  assert.equal(rows(absent)[0].timeOut, '—');
  assert.equal(liveAttendance(absent, students, [schedule], date)[0].timeOut, '—');
});

test('manual zero time is absent even for a class beginning near midnight', () => {
  const saved = scan('00:00:00', { source: 'faculty-manual', status: 'ABSENT', localRecordId: `manual:10:1:${date}` });
  assert.equal(manualAttendanceRows([saved], students, { ...schedule, startTime: '00:10:00', endTime: '01:10:00' }, date)[0].attendanceStatus, 'Absent');
});

test('checkbox status follows the inclusive present and late windows', () => {
  for (const [time, status] of [
    ['07:44:59', 'Absent'], ['07:45:00', 'Present'], ['08:15:59', 'Present'],
    ['08:16:00', 'Late'], ['08:45:59', 'Late'], ['08:46:00', 'Absent'],
  ]) assert.equal(rows([scan(time)])[0].attendanceStatus, status, time);
  assert.equal(rows([])[0].attendanceStatus, 'Absent');
});

test('uses the earliest eligible IN and ignores other dates, students and OUT scans', () => {
  const logs = [scan('08:30:00', { id: 4 }), scan('07:30:00', { id: 1 }),
    scan('08:00:00', { id: 3 }), scan('07:45:00', { userId: 2 }),
    scan('07:45:00', { logDate: '2026-10-11' }), scan('07:45:00', { status: 'OUT' })];
  assert.equal(rows(logs)[0].attendanceStatus, 'Present');
  assert.equal(rows(logs)[0].timeIn, '8:00 AM');
  assert.equal(rows([scan('08:00:00', { status: 'OUT' })])[0].attendanceStatus, 'Absent');
  assert.equal(rows([scan('08:00:00', { userId: '1' })])[0].attendanceStatus, 'Present');
});

test('roster is restricted to active students in the selected class and day', () => {
  const users = [...students, { ...students[0], id: 2, department: 'BSIT 1-B' },
    { ...students[0], id: 3, status: 'Inactive' }, { ...students[0], id: 4, role: 'faculty' }];
  assert.deepEqual(manualAttendanceRows([], users, schedule, date).map(row => row.id), [1]);
  assert.deepEqual(manualAttendanceRows([], users, schedule, '2026-10-13'), []);
  assert.deepEqual(manualAttendanceRows([], users, null, date), []);
});
