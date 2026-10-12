import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceReport } from '../src/utils/attendanceReport.js';
import { createAttendancePdf } from '../src/utils/attendancePdf.js';

const schedule = { id: 10, yearLevel: '1st Year', section: 'A', days: ['Monday', 'Tuesday'], startTime: '08:00', endTime: '09:00', subjectCode: 'ENG101', subjectName: 'English' };
const student = { id: 1, role: 'student', status: 'Active', firstName: 'Ana', lastName: 'Cruz', idNumber: '001', department: 'BSIT 1-A' };
const now = new Date('2026-10-14T03:00:00Z');
const log = (id, date, time) => ({ id, userId: 1, logDate: date, logTime: time, status: 'IN' });

test('report sums attendance occurrences across inclusive dates and the selected roster', () => {
  const users = [student, { ...student, id: 2, firstName: 'Ben' },
    { ...student, id: 3, department: 'BSIT 1-B' }, { ...student, id: 4, department: 'BSIT 2-A' },
    { ...student, id: 5, status: 'Inactive' }, { ...student, id: 6, role: 'faculty' }];
  const report = buildAttendanceReport([
    log(1, '2026-10-12', '07:55'), log(2, '2026-10-12', '08:01'),
    log(3, '2026-10-13', '08:16'), log(4, '2026-10-13', '13:00'),
  ], users, schedule, '2026-10-11', '2026-10-14', now);
  assert.equal(report.rows.length, 2);
  assert.deepEqual(report.rows.map(row => [row.present, row.late, row.absent, row.total]), [[1, 1, 0, 2], [0, 0, 2, 2]]);
  assert.deepEqual(report.totals, { present: 1, late: 1, absent: 2, total: 4 });
  assert.deepEqual(report.classDates, ['2026-10-12', '2026-10-13']);
  assert.equal(report.details.length, 4);
});

test('reports preserve zero counts without class dates and exclude unresolved attendance today', () => {
  const weekend = buildAttendanceReport([], [student], schedule, '2026-10-10', '2026-10-11', now);
  assert.equal(weekend.rows.length, 1);
  assert.equal(weekend.totals.total, 0);
  assert.equal(weekend.classDates.length, 0);
  const ongoing = buildAttendanceReport([], [student], schedule, '2026-10-12', '2026-10-12', new Date('2026-10-12T00:45:00Z'));
  assert.equal(ongoing.totals.absent, 0);
  const closed = buildAttendanceReport([], [student], schedule, '2026-10-12', '2026-10-12', new Date('2026-10-12T00:46:00Z'));
  assert.equal(closed.totals.absent, 1);
});

test('reports sort by last, first, and middle name and PDFs use the same name order', () => {
  const users = [
    { ...student, id: 1, firstName: 'Aaron', lastName: 'Zulu' },
    { ...student, id: 2, firstName: 'Zoe', middleName: 'Grace', lastName: 'Abad' },
    { ...student, id: 3, firstName: ' Ana ', middleName: 'Maria', lastName: ' cruz ' },
    { ...student, id: 4, firstName: 'Ben', lastName: 'Cruz' },
    { ...student, id: 5, firstName: 'Ana', middleName: 'Luz', lastName: 'Cruz' },
  ];
  const report = { ...buildAttendanceReport([], users, schedule, '2026-10-12', '2026-10-13', now), facultyName: 'Professor Cruz' };
  assert.deepEqual(report.rows.map(row => row.userId), [2, 5, 3, 4, 1]);
  assert.deepEqual(report.rows.map(row => row.name), ['Abad, Zoe Grace', 'Cruz, Ana Luz', 'cruz, Ana Maria', 'Cruz, Ben', 'Zulu, Aaron']);
  const doc = createAttendancePdf(report);
  assert.deepEqual(doc.lastAutoTable.body.map(row => row.cells[2].text.join(' ')), report.rows.map(row => row.name));
});

test('PDF exports all student summaries with A4 pages and without branding or page footers', () => {
  const users = Array.from({ length: 75 }, (_, index) => ({ ...student, id: index + 1, idNumber: `ID-${index + 1}`, firstName: `Student ${index + 1}` }));
  const report = { ...buildAttendanceReport([], users, schedule, '2026-10-12', '2026-10-13', now), facultyName: 'Professor Cruz' };
  const doc = createAttendancePdf(report);
  assert.ok(doc.getNumberOfPages() >= 3);
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 210) < 0.1);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 297) < 0.1);
  const pdf = doc.output();
  assert.ok(pdf.startsWith('%PDF-'));
  assert.ok(pdf.includes('Class Attendance Report'));
  assert.ok(!pdf.includes('Attendance Ledger'));
  assert.ok(!pdf.includes('Counts represent'));
  assert.ok(!pdf.includes('Manila'));
  assert.ok(!pdf.includes('TOTAL DAYS'));
  assert.equal(doc.lastAutoTable.head[0].cells[6].text.join(' '), 'Total Days');
  assert.equal(doc.lastAutoTable.head[0].cells[1].text.join(' '), 'ID Number');
  assert.ok(!pdf.includes('Student ID'));
  assert.ok(pdf.includes('M, T |'));
  assert.ok(pdf.includes('ID-75'));
  assert.ok(!pdf.includes('CLASS TOTALS'));
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    const content = doc.internal.pages[page].join('\n');
    assert.ok(!content.includes('FRANCIS KEY'));
    assert.ok(!content.includes('Attendance Management'));
    assert.ok(!content.includes('Administrative attendance report'));
    assert.ok(!content.includes(`Page ${page} of`));
  }
});

test('PDF handles an empty roster and a long wrapped subject title', () => {
  const report = { ...buildAttendanceReport([], [], { ...schedule, subjectName: 'An extended subject name with detailed coverage '.repeat(8) }, '2026-10-12', '2026-10-13', now), facultyName: 'Professor Cruz' };
  const doc = createAttendancePdf(report);
  assert.ok(doc.output().includes('No active students in the selected class.'));
  assert.ok(!doc.output().includes('Attendance Ledger'));
});
