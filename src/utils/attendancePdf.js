import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { attendanceTime } from './attendance.js';
import { formatReportDays } from './attendanceReport.js';

export function createAttendancePdf(report) {
  const { schedule, rows, totals, start, end, facultyName, generatedAt, classDates } = report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Class Attendance Report', subject: `${schedule.subjectCode} | ${start} to ${end}`, author: 'Francis Key Attendance Management' });
  const margin = 16;
  const width = 178;
  const generated = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(generatedAt);
  // All fills are white; all text and rules are black, including table headers.
  const tableStyle = {
    theme: 'grid', margin: { left: margin, right: margin, top: 30, bottom: 20 },
    styles: { font: 'helvetica', fontSize: 9, textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.15, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fontStyle: 'bold', textColor: 0, fillColor: 255, lineColor: 0, lineWidth: 0.25 },
    footStyles: { fontStyle: 'bold', textColor: 0, fillColor: 255 },
    alternateRowStyles: { fillColor: 255 },
    rowPageBreak: 'avoid',
  };

  function heading(title, subtitle) {
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FRANCIS KEY', margin, 17);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Attendance Management', 194, 17, { align: 'right' });
    doc.setLineWidth(0.35);
    doc.line(margin, 21, 194, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, 33);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, margin, 41);
  }

  function continuation() {
    if (doc.getCurrentPageInfo().pageNumber === 1) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FRANCIS KEY | CLASS ATTENDANCE REPORT', margin, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${start} to ${end}`, 194, 17, { align: 'right' });
    doc.setLineWidth(0.25);
    doc.line(margin, 21, 194, 21);
  }

  heading('Class Attendance Report', `Reporting period: ${start} to ${end} (inclusive)`);
  autoTable(doc, {
    ...tableStyle, startY: 48, theme: 'plain',
    styles: { ...tableStyle.styles, lineWidth: 0, fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 3 } },
    columnStyles: { 0: { cellWidth: 33, fontStyle: 'bold' }, 1: { cellWidth: 145 } },
    body: [
      ['Subject', `${schedule.subjectCode} - ${schedule.subjectName}`],
      ['Year / Section', `${schedule.yearLevel} / Section ${schedule.section}`],
      ['Faculty', facultyName],
      ['Class schedule', `${formatReportDays(schedule.days) || 'No days assigned'} | ${attendanceTime(schedule.startTime)} - ${attendanceTime(schedule.endTime)}`],
      ['Coverage', `${classDates.length} scheduled dates; ${rows.length} active students`],
      ['Computed at', generated],
    ],
    willDrawPage: continuation,
  });
  autoTable(doc, {
    ...tableStyle, startY: doc.lastAutoTable.finalY + 6,
    head: [['PRESENT', 'LATE', 'ABSENT', 'TOTAL DAYS']],
    body: [[totals.present, totals.late, totals.absent, totals.total]],
    styles: { ...tableStyle.styles, halign: 'center', cellWidth: width / 4 },
    bodyStyles: { fontSize: 16, fontStyle: 'bold', cellPadding: 4 },
    willDrawPage: continuation,
  });
  autoTable(doc, {
    ...tableStyle, startY: doc.lastAutoTable.finalY + 8,
    head: [['No.', 'Student ID', 'Student name', 'Present', 'Late', 'Absent', 'Total Days']],
    body: rows.length ? rows.map((row, index) => [index + 1, row.idNumber, row.name, row.present, row.late, row.absent, row.total])
      : [[{ content: 'No active students in the selected class.', colSpan: 7 }]],
    foot: [[{ content: 'CLASS TOTALS', colSpan: 3 }, totals.present, totals.late, totals.absent, totals.total]],
    showFoot: 'lastPage',
    columnStyles: {
      0: { cellWidth: 11 }, 1: { cellWidth: 30 }, 2: { cellWidth: 65 },
      3: { cellWidth: 18, halign: 'right' }, 4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
    willDrawPage: continuation,
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.setLineWidth(0.15);
    doc.line(margin, 280, 194, 280);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Francis Key | Administrative attendance report', margin, 286);
    doc.text(`Page ${page} of ${pages}`, 194, 286, { align: 'right' });
  }
  return doc;
}
