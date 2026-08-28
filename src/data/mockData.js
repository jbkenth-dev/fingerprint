export const roles = ["admin", "faculty", "student"];

export const roleLabels = {
  admin: "Administrator",
  faculty: "Faculty",
  student: "Student",
};

export const routeConfig = {
  admin: [
    { label: "Dashboard & Monitoring", path: "/admin/dashboard" },
    { label: "Class Subject", path: "/admin/class-subject" },
    { label: "Class Scheduling", path: "/admin/class-scheduling" },
    { label: "Attendance", path: "/admin/attendance", disabled: false },
    { label: "Reports", path: "/admin/reports", disabled: false },
    { label: "Department", path: "/admin/department" },
    { label: "Account", path: "/admin/account" },
    { label: "Archived", path: "/admin/archive" },
  ],
  faculty: [
    { label: "Dashboard & Monitoring", path: "/faculty/dashboard" },
    { label: "Attendance", path: "/faculty/attendance", disabled: true },
    { label: "Reports", path: "/faculty/reports", disabled: true },
    { label: "Account", path: "/faculty/account" },
  ],
  student: [
    { label: "Dashboard & Monitoring", path: "/student/dashboard" },
    { label: "Attendance", path: "/student/attendance", disabled: true },
    { label: "Account", path: "/student/account" },
  ],
};

export const initialUsers = [
  {
    id: 1,
    role: "admin",
    status: "Active",
    firstName: "Francis",
    middleName: "Santos",
    lastName: "Key",
    email: "admin@franciskey.local",
    phone: "09171234567",
    smartCardId: "FK-ADM-001",
    fingerprintId: "BIO-ADM-01",
    department: "System Administration",
  },
  {
    id: 2,
    role: "faculty",
    status: "Active",
    firstName: "Andrea",
    middleName: "Lopez",
    lastName: "Mendoza",
    email: "andrea.mendoza@franciskey.local",
    phone: "09181234567",
    smartCardId: "FK-FAC-102",
    fingerprintId: "BIO-FAC-12",
    department: "College of Computing",
  },
  {
    id: 3,
    role: "faculty",
    status: "Active",
    firstName: "Luis",
    middleName: "Garcia",
    lastName: "Ramos",
    email: "luis.ramos@franciskey.local",
    phone: "09192345678",
    smartCardId: "FK-FAC-215",
    fingerprintId: "BIO-FAC-24",
    department: "Engineering",
  },
  {
    id: 4,
    role: "student",
    status: "Active",
    firstName: "Mika",
    middleName: "Cruz",
    lastName: "Santos",
    email: "mika.santos@student.franciskey.local",
    phone: "09981234567",
    smartCardId: "FK-STU-901",
    fingerprintId: "BIO-STU-93",
    department: "BSIT 3A",
  },
  {
    id: 5,
    role: "student",
    status: "Inactive",
    firstName: "Paolo",
    middleName: "Diaz",
    lastName: "Reyes",
    email: "paolo.reyes@student.franciskey.local",
    phone: "09992345678",
    smartCardId: "FK-STU-774",
    fingerprintId: "BIO-STU-74",
    department: "BSCS 2B",
  },
];

export const panelContent = {
  dashboard: {
    title: "Dashboard & Monitoring",
    description: "",
    metrics: [
      { label: "Today's Time-ins", value: "1,284", hint: "+12% vs yesterday" },
      { label: "Connected Biometric Scanners", value: "18 / 20", hint: "2 under maintenance" },
      { label: "Smart Card Reads", value: "3,942", hint: "Peak at 8:03 AM" },
      { label: "Attendance Accuracy", value: "99.3%", hint: "Validated entries only" },
    ],
  },
  classSubject: {
    title: "Class Subject",
    description:
      "Review class-subject assignments, section coverage, and scheduling readiness before connecting this view to live academic records.",
    metrics: [
      { label: "Active Subjects", value: "128", hint: "Across current term offerings" },
      { label: "Assigned Faculty", value: "46", hint: "Handling one or more subjects" },
      { label: "Open Sections", value: "12", hint: "Still awaiting faculty assignment" },
      { label: "Schedule Conflicts", value: "3", hint: "Flagged for admin review" },
    ],
  },
  classScheduling: {
    title: "Class Scheduling",
    description:
      "Organize class schedules, room assignments, and timetable coverage before linking this page to live academic scheduling data.",
    metrics: [
      { label: "Scheduled Classes", value: "214", hint: "Current active term" },
      { label: "Open Time Slots", value: "18", hint: "Available for assignment" },
      { label: "Room Conflicts", value: "2", hint: "Needs admin review" },
      { label: "Faculty Loads", value: "46", hint: "With active schedules" },
    ],
  },
  smartCard: {
    title: "Smart Card",
    description:
      "Track issued cards, last tap activity, and card verification events before connecting to the real database.",
    metrics: [
      { label: "Issued Cards", value: "2,430", hint: "Students and faculty" },
      { label: "Pending Activation", value: "37", hint: "New accounts awaiting ID print" },
      { label: "Blocked Cards", value: "12", hint: "Reported lost or damaged" },
      { label: "Reader Health", value: "96%", hint: "All gates synced" },
    ],
  },
  biometric: {
    title: "Fingerprint Biometric",
    description:
      "Sample monitoring area for enrollment quality, verification success rate, and scanner readiness.",
    metrics: [
      { label: "Enrolled Prints", value: "2,211", hint: "Templates stored securely" },
      { label: "Match Success Rate", value: "98.8%", hint: "Morning rush performance" },
      { label: "Scanner Sync", value: "11 sec", hint: "Average sync delay" },
      { label: "Retry Cases", value: "21", hint: "Mostly partial scans" },
    ],
  },
  attendance: {
    title: "Attendance",
    description: "",
    metrics: [
      { label: "Total Records", value: "0", hint: "" },
      { label: "Present Today", value: "0", hint: "" },
      { label: "Late Today", value: "0", hint: "" },
      { label: "Absent Today", value: "0", hint: "" },
      { label: "Potential Duplicates", value: "0", hint: "" }
    ],
  },
  reports: {
    title: "Reports",
    description:
      "Prepare attendance exports, compliance snapshots, and exception summaries with polished report cards.",
    metrics: [
      { label: "Generated Reports", value: "48", hint: "This month" },
      { label: "Pending Exports", value: "5", hint: "Large date ranges" },
      { label: "Audit-ready Logs", value: "100%", hint: "Immutable format prepared" },
      { label: "Archive Health", value: "Healthy", hint: "No missing report files" },
    ],
  },
};

export const sampleAttendance = [
  { name: "Andrea Mendoza", role: "Faculty", method: "Fingerprint", status: "Present", timestamp: "08:01 AM" },
  { name: "Luis Ramos", role: "Faculty", method: "Smart Card", status: "Present", timestamp: "08:06 AM" },
  { name: "Mika Santos", role: "Student", method: "Smart Card", status: "Late", timestamp: "08:18 AM" },
  { name: "Paolo Reyes", role: "Student", method: "Fingerprint", status: "Absent", timestamp: "No Record" },
];
