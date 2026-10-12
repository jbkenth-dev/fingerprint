import test from 'node:test';
import assert from 'node:assert/strict';
import { manualAttendanceRows } from '../src/utils/manualAttendance.js';

const date = '2026-10-12';
const schedule = { id: 10, yearLevel: '1st Year', section: 'A', days: ['Monday'], startTime: '08:00:00', endTime: '09:00:00' };
const students = [{ id: 1, role: 'student', status: 'Active', department: 'BSIT 1-A' }];
const scan = (logTime, extra = {}) => ({ id: 1, userId: 1, logDate: date, logTime, status: 'IN', ...extra });
const rows = logs => manualAttendanceRows(logs, students, schedule, date);

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
