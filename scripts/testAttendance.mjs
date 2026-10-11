import test from 'node:test';
import assert from 'node:assert/strict';
import { manilaNow, datesInRange, fetchAttendanceRange, classifyAttendance, liveAttendance, searchAttendance } from '../src/utils/attendance.js';

const users = [{ id: 1, role: 'student', status: 'Active', firstName: 'Ana', lastName: 'Cruz', idNumber: '001', department: 'BSIT 1-A' }];
const schedules = [
  { id: 10, yearLevel: '1st Year', section: 'A', days: ['Monday', 'Tuesday'], startTime: '08:00:00', endTime: '09:00:00', subjectCode: 'ENG', subjectName: 'English' },
  { id: 11, yearLevel: '1st Year', section: 'A', days: ['Monday', 'Tuesday'], startTime: '13:00:00', endTime: '14:00:00', subjectCode: 'MATH', subjectName: 'Math' },
];
const log = (id, logDate, logTime, status = 'IN') => ({ id, userId: 1, logDate, logTime, status, name: 'Ana Cruz', idNumber: '001' });

test('date ranges include both boundaries and reject invalid dates', () => {
  assert.deepEqual(datesInRange('2026-09-30', '2026-10-02'), ['2026-09-30', '2026-10-01', '2026-10-02']);
  assert.deepEqual(datesInRange('2026-10-02', '2026-10-01'), []);
  assert.deepEqual(datesInRange('2026-02-30', '2026-03-01'), []);
  assert.deepEqual(datesInRange('', ''), []);
});

test('today uses Manila date across UTC midnight boundaries', () => {
  assert.equal(manilaNow(new Date('2026-10-11T16:05:00Z')).date, '2026-10-12');
  assert.equal(manilaNow(new Date('2026-10-11T16:05:00Z')).minutes, 5);
});

test('classifies each date and class separately, with paired times and unique row keys', () => {
  const logs = [log(1, '2026-10-12', '08:15:00'), log(2, '2026-10-12', '09:00:00', 'OUT'),
    log(3, '2026-10-12', '13:16:00'), log(4, '2026-10-12', '14:00:00', 'OUT'),
    log(5, '2026-10-13', '07:00:00')];
  const result = classifyAttendance(logs, users, schedules, '2026-10-12', '2026-10-13', new Date('2026-10-14T10:00:00Z'));
  assert.equal(result.present.length, 1);
  assert.equal(result.present[0].classes, 'ENG — English');
  assert.equal(result.present[0].timeOut, '9:00 AM');
  assert.equal(result.late.length, 1);
  assert.equal(result.late[0].classes, 'MATH — Math');
  assert.equal(result.late[0].timeIn, '1:16 PM');
  assert.equal(result.absent.length, 2);
  assert.ok(result.absent.every(record => record.logDate === '2026-10-13'));
  const all = Object.values(result).flat();
  assert.equal(new Set(all.map(record => record.key)).size, all.length);
});

test('does not create absences for future dates, ongoing windows, inactive students, or days without classes', () => {
  const now = new Date('2026-10-12T01:00:00Z'); // Monday 09:00 Manila.
  const result = classifyAttendance([], users, schedules, '2026-10-11', '2026-10-13', now);
  assert.equal(result.absent.length, 0);
  const later = classifyAttendance([], users, schedules, '2026-10-12', '2026-10-12', new Date('2026-10-12T01:16:00Z'));
  assert.equal(later.absent.length, 1);
  assert.equal(classifyAttendance([], [{ ...users[0], status: 'Inactive' }], schedules, '2026-10-12', '2026-10-12', new Date('2026-10-14T00:00:00Z')).absent.length, 0);
});

test('live shows only today, matches later classes, and pairs IN/OUT without duplicate warnings', () => {
  const result = liveAttendance([log(1, '2026-10-11', '08:00:00'), log(2, '2026-10-12', '13:00:00'), log(3, '2026-10-12', '14:00:00', 'OUT')], users, schedules, '2026-10-12');
  assert.equal(result.length, 1);
  assert.equal(result[0].classes, 'MATH — Math');
  assert.equal(result[0].status, 'Present');
  assert.equal(result[0].timeOut, '2:00 PM');
  assert.equal(searchAttendance(result, '  ANA ').length, 1);
  assert.equal(searchAttendance(result, '001').length, 1);
  assert.equal(searchAttendance(result, 'missing').length, 0);
});

test('loads a combined range in API pages instead of one connection per day', async () => {
  const calls = [];
  const result = await fetchAttendanceRange(async path => {
    const params = new URL(path, 'http://localhost').searchParams;
    calls.push(params);
    const offset = Number(params.get('offset'));
    const count = Math.min(500, 1002 - offset);
    return { records: Array.from({ length: count }, (_, i) => log(offset + i, '2026-10-12', '08:00:00')), total: 1002,
      range: { startDate: params.get('startDate'), endDate: params.get('endDate') } };
  }, '2026-10-12', '2026-10-13');
  assert.equal(result.length, 1002);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(params => params.get('limit') === '500'));
  assert.equal(calls.filter(params => params.get('offset') === '500').length, 1);
  assert.ok(calls.every(params => params.get('startDate') === '2026-10-12' && params.get('endDate') === '2026-10-13'));
});

test('an empty month requires only one request and never falls back to an old unfiltered API', async () => {
  let calls = 0;
  const records = await fetchAttendanceRange(async () => {
    calls++;
    return { records: [], total: 0, range: { startDate: '2026-09-01', endDate: '2026-09-30' } };
  }, '2026-09-01', '2026-09-30');
  assert.deepEqual(records, []);
  assert.equal(calls, 1);
  await assert.rejects(fetchAttendanceRange(async () => ({ records: [], total: 0 }), '2026-09-01', '2026-09-30'), /API needs updating/);
});

test('aborted or incomplete API requests cannot produce a partial report', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchAttendanceRange(() => assert.fail('Aborted fetch should not run'), '2026-10-12', '2026-10-12', controller.signal), { name: 'AbortError' });
  await assert.rejects(fetchAttendanceRange(async () => ({ records: [], total: 10 }), '2026-10-12', '2026-10-12'), /changed while loading/);
});
