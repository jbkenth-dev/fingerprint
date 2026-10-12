import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { attendanceTime } from './attendance.js';
import { formatReportDays, formatReportSemester } from './attendanceReport.js';

export function createAttendancePdf(report) {
  const { schedule, rows, start, end, facultyName, generatedAt, classDates } = report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Class Attendance Report', subject: `${schedule.subjectCode} | ${start} to ${end}` });
  const margin = 16;
  const generated = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(generatedAt);
  // All fills are white; all text and rules are black, including table headers.
  const tableStyle = {
    theme: 'grid', margin: { left: margin, right: margin, top: 16, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 9, textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.15, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fontStyle: 'bold', textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.25 },
    alternateRowStyles: { fillColor: 255 },
    rowPageBreak: 'avoid',
  };

  function heading(title, subtitle) {
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, margin, 30);
  }

  heading('Class Attendance Report', `Reporting period: ${start} to ${end} (inclusive)`);
  autoTable(doc, {
    ...tableStyle, startY: 37, theme: 'plain',
    styles: { ...tableStyle.styles, lineWidth: 0, fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 3 } },
    columnStyles: { 0: { cellWidth: 178 / 3 }, 1: { cellWidth: 178 / 3 }, 2: { cellWidth: 178 / 3 } },
    body: [
      ['Subject', 'Class', 'Semester'],
      [`${schedule.subjectCode} — ${schedule.subjectName}`, `${schedule.yearLevel} · Section ${schedule.section}`, formatReportSemester(schedule.semester)],
      ['Faculty', 'Schedule', 'Coverage'],
      [facultyName, `${formatReportDays(schedule.days) || 'No days assigned'} | ${attendanceTime(schedule.startTime)} – ${attendanceTime(schedule.endTime)}`, `${classDates.length} scheduled dates · ${rows.length} active students`],
      [{ content: 'Computed at', colSpan: 3 }],
      [{ content: generated, colSpan: 3 }],
    ],
    didParseCell: ({ row, cell }) => {
      if (row.index % 2 === 0) {
        cell.styles.fontStyle = 'bold';
        cell.styles.cellPadding = { top: row.index ? 4 : 1.5, bottom: 1, left: 0, right: 3 };
      }
    },
  });
  autoTable(doc, {
    ...tableStyle, startY: doc.lastAutoTable.finalY + 8,
    head: [['No.', 'ID Number', 'Student name', 'Present', 'Late', 'Absent', 'Total Days']],
    body: rows.length ? rows.map((row, index) => [index + 1, row.idNumber, row.name, row.present, row.late, row.absent, row.total])
      : [[{ content: 'No active students in the selected class.', colSpan: 7 }]],
    columnStyles: {
      0: { cellWidth: 11 }, 1: { cellWidth: 30 }, 2: { cellWidth: 65 },
      3: { cellWidth: 18, halign: 'right' }, 4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
  });

  return doc;
}
