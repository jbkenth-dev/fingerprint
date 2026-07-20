import React from "react";
import { createPortal } from "react-dom";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Activity, Archive, Asterisk, BadgeCheck, BookOpenText, Building2, CalendarRange, ChevronDown, CreditCard, EllipsisVertical, Eye, EyeOff, FileBarChart, Fingerprint, LayoutDashboard, LockKeyhole, LogOut, Menu, RefreshCw, ShieldUser, UserCog, UserRound, Users, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { panelContent, roleLabels, roles, routeConfig, sampleAttendance } from "./data/mockData";
import { useMockLoading } from "./hooks/useMockLoading";
import { useManilaClock } from "./hooks/useManilaClock";
import { useAuth } from "./state/AuthContext";
import { apiFetch } from "./api";

const navIcons = {
  "Dashboard & Monitoring": LayoutDashboard,
  "Class Subject": BookOpenText,
  "Class Scheduling": CalendarRange,
  "Smart Card": CreditCard,
  "Fingerprint Biometric": Fingerprint,
  Attendance: Activity,
  Reports: FileBarChart,
  Department: Building2,
  Account: UserCog,
  Archived: Archive,
};

const emptyClassSubjectForm = {
  subjectCode: "",
  subjectName: "",
  yearLevel: "",
  semester: "",
};
const yearLevelOrder = {
  "1st Year": 1,
  "2nd Year": 2,
  "3rd Year": 3,
  "4th Year": 4,
};
const semesterOrder = {
  "1st Sem": 1,
  "2nd Sem": 2,
};
const academicSections = [
  { yearLevel: "1st Year", semester: "1st Sem", label: "1st Year, 1st Semester" },
  { yearLevel: "1st Year", semester: "2nd Sem", label: "1st Year, 2nd Semester" },
  { yearLevel: "2nd Year", semester: "1st Sem", label: "2nd Year, 1st Semester" },
  { yearLevel: "2nd Year", semester: "2nd Sem", label: "2nd Year, 2nd Semester" },
  { yearLevel: "3rd Year", semester: "1st Sem", label: "3rd Year, 1st Semester" },
  { yearLevel: "3rd Year", semester: "2nd Sem", label: "3rd Year, 2nd Semester" },
  { yearLevel: "4th Year", semester: "1st Sem", label: "4th Year, 1st Semester" },
  { yearLevel: "4th Year", semester: "2nd Sem", label: "4th Year, 2nd Semester" },
];
const sectionOptions = ["A", "B", "C", "D", "E"];
const yearLevelOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const semesterOptions = ["1st Sem", "2nd Sem"];
const scheduleDayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export default function App() {
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/admin" element={<ProtectedLayout allowedRole="admin" />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="class-subject" element={<ClassSubjectPage />} />
          <Route path="class-scheduling" element={<ClassSchedulingPage />} />
          <Route path="smart-card" element={<RolePanel pageKey="smartCard" role="admin" />} />
          <Route path="fingerprint-biometric" element={<RolePanel pageKey="biometric" role="admin" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="admin" />} />
          <Route path="reports" element={<RolePanel pageKey="reports" role="admin" />} />
          <Route path="department" element={<AdminDepartmentPage />} />
          <Route path="account" element={<AdminAccountPage />} />
          <Route path="archive" element={<AdminArchivePage />} />
          <Route path="developer-mode/attendance" element={<DeveloperAttendancePage />} />
        </Route>
        <Route path="/faculty" element={<ProtectedLayout allowedRole="faculty" />}>
          <Route index element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="dashboard" element={<RolePanel pageKey="dashboard" role="faculty" />} />
          <Route path="smart-card" element={<RolePanel pageKey="smartCard" role="faculty" />} />
          <Route path="fingerprint-biometric" element={<RolePanel pageKey="biometric" role="faculty" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="faculty" />} />
          <Route path="reports" element={<RolePanel pageKey="reports" role="faculty" />} />
          <Route path="account" element={<SelfAccountPage role="faculty" />} />
        </Route>
        <Route path="/student" element={<ProtectedLayout allowedRole="student" />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<RolePanel pageKey="dashboard" role="student" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="student" />} />
          <Route path="account" element={<SelfAccountPage role="student" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function HomePage() {
  const { time, date } = useManilaClock();

  return (
    <main className="app-shell min-h-dvh">
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <section className="animate-fade-up home-reference-card relative w-full max-w-5xl overflow-visible px-5 pb-8 pt-12 text-center sm:px-8 sm:pb-10 sm:pt-14 lg:px-12 lg:pb-12 lg:pt-16">
          <div className="home-reference-logo">
            <img
              src="/sfcg-logo.jpeg"
              alt="Saint Francis College logo"
              className="h-16 w-16 rounded-full object-cover sm:h-18 sm:w-18 lg:h-20 lg:w-20"
            />
          </div>

          <div className="relative z-10">
            <p className="home-reference-title font-display">
              FRANCIS KEY: SMART CARD &amp; FINGERPRINT-BASED ATTENDANCE SYSTEM
            </p>

            <p className="home-reference-time font-display">{time}</p>
            <p className="home-reference-date">{date}</p>

            <NavLink
              to="/signin"
              className="home-reference-button mt-5 inline-flex items-center justify-center px-7 py-2 text-sm font-medium sm:mt-6"
            >
              Sign In
            </NavLink>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignInPage() {
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ identifier: "", password: "", role: "admin" });
  const [feedback, setFeedback] = React.useState({ message: "", tone: "error" });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (session?.role) navigate(`/${session.role}`, { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ message: "", tone: "error" });
    if (!form.identifier.trim()) {
      setFeedback({ message: "Username or email is required.", tone: "error" });
      return;
    }
    if (!form.password.trim()) {
      setFeedback({ message: "Password is required.", tone: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(form);
      navigate(`/${user.role}`, { replace: true });
    } catch (submissionError) {
      setFeedback({ message: submissionError.message, tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell min-h-dvh">
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-6 sm:px-6">
        <section className="signin-card animate-fade-up w-full max-w-[34rem] px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="flex justify-center">
            <img
              src="/sfcg-logo.jpeg"
              alt="Saint Francis College logo"
              className="signin-logo h-18 w-18 rounded-full object-cover sm:h-20 sm:w-20"
            />
          </div>

          <h1 className="mt-6 text-center text-2xl font-semibold text-gray-800 sm:text-[1.75rem]">Account Sign In</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field
              label="Username or Email"
              value={form.identifier}
              onChange={(value) => setForm((prev) => ({ ...prev, identifier: value }))}
              placeholder="Enter username or email"
              icon={UserRound}
              variant="signin"
            />

            <Field
              label="Password"
              value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
              placeholder="Enter password"
              type="password"
              icon={LockKeyhole}
              variant="signin"
            />

            <SelectField
              label="Role"
              value={form.role}
              onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
              options={roles.map((role) => ({ label: roleLabels[role], value: role }))}
              icon={ShieldUser}
              variant="signin"
            />
            <button type="submit" className="signin-submit" disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </section>
      </div>
      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />
    </main>
  );
}

function ProtectedLayout({ allowedRole }) {
  const { session, currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!session) return <Navigate to="/signin" replace />;
  if (session.role !== allowedRole) return <Navigate to={`/${session.role}`} replace />;

  return (
    <div className="app-shell min-h-dvh">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="btn btn-ghost shrink-0 p-2"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Francis Key</span>
          <BrandMark compact />
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div className="lg:hidden">
        <div
          className={`sidebar-mobile-overlay${mobileMenuOpen ? " open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className={`sidebar-mobile${mobileMenuOpen ? " open" : ""}`}>
          <div className="flex items-start justify-between p-5">
            <BrandLockup />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 rounded-lg p-1 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mx-5 mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Signed in as</div>
            <div className="mt-2 text-base font-semibold text-white">
              {[currentUser?.firstName, currentUser?.middleName, currentUser?.lastName].filter(Boolean).join(" ")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <InfoPill label="Role" value={roleLabels[allowedRole]} variant="sidebar" />
              <InfoPill
                label="Username"
                value={currentUser?.username ?? currentUser?.email?.split("@")[0] ?? "N/A"}
                variant="sidebar"
              />
            </div>
          </div>

          <nav className="space-y-1 px-5">
            {routeConfig[allowedRole].map((item) => {
              const Icon = navIcons[item.label];
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      "sidebar-nav-item",
                      (isActive || location.pathname === item.path) && "active",
                    )
                  }
                >
                  <span className="sidebar-nav-icon">
                    <Icon size={16} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="px-5 pt-6 pb-5">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/signin", { replace: true });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="relative grid min-h-dvh gap-0 overflow-x-hidden lg:h-dvh lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="sidebar hidden overflow-hidden lg:block lg:sticky lg:top-0 lg:h-dvh lg:min-w-0">
          <div className="flex h-full flex-col overflow-y-auto p-5">
            <BrandLockup />

            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wider text-white/50">Signed in as</div>
              <div className="mt-2 text-base font-semibold text-white">
                {[currentUser?.firstName, currentUser?.middleName, currentUser?.lastName].filter(Boolean).join(" ")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <InfoPill label="Role" value={roleLabels[allowedRole]} variant="sidebar" />
                <InfoPill
                  label="Username"
                  value={currentUser?.username ?? currentUser?.email?.split("@")[0] ?? "N/A"}
                  variant="sidebar"
                />
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {routeConfig[allowedRole].map((item) => {
                const Icon = navIcons[item.label];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        "sidebar-nav-item",
                        (isActive || location.pathname === item.path) && "active",
                      )
                    }
                  >
                    <span className="sidebar-nav-icon">
                      <Icon size={16} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/signin", { replace: true });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4 overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5 lg:min-h-0 lg:overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ─── Admin Dashboard ─── */
function AdminDashboardPage() {
  const { users } = useAuth();
  const [todayLogs, setTodayLogs] = React.useState([]);
  const [weekLogs, setWeekLogs] = React.useState({});
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  function getManilaDate(daysAgo = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  }

  function formatTime(logTime) {
    if (!logTime || !/^\d{2}:\d{2}/.test(logTime)) return "—";
    const [h, m] = logTime.slice(0, 5).split(":").map(Number);
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  }

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const today = getManilaDate(0);
        const [todayRes, deptRes, ...weekResults] = await Promise.allSettled([
          apiFetch(`/attendance.php?date=${today}&limit=500&offset=0`),
          apiFetch("/departments.php"),
          ...Array.from({ length: 7 }, (_, i) =>
            apiFetch(`/attendance.php?date=${getManilaDate(6 - i)}&limit=500&offset=0`)
          ),
        ]);
        if (cancelled) return;
        if (todayRes.status === "fulfilled" && todayRes.value?.records) setTodayLogs(todayRes.value.records);
        if (deptRes.status === "fulfilled" && Array.isArray(deptRes.value)) setDepartments(deptRes.value);
        const newWeek = {};
        weekResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.records) newWeek[getManilaDate(6 - i)] = r.value.records;
        });
        setWeekLogs(newWeek);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Derived metrics ── */
  const activeUsers = React.useMemo(() => users.filter((u) => u.status === "Active"), [users]);
  const activeUserIds = React.useMemo(() => new Set(activeUsers.map((u) => u.id)), [activeUsers]);
  const admins = React.useMemo(() => users.filter((u) => u.role === "admin"), [users]);
  const faculty = React.useMemo(() => users.filter((u) => u.role === "faculty"), [users]);
  const students = React.useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const smartCardUsers = React.useMemo(() => users.filter((u) => u.smartCardId && u.status !== "Archived"), [users]);
  const fingerprintUsers = React.useMemo(() => users.filter((u) => u.fingerprintId && u.status !== "Archived"), [users]);

  const userFirstIn = React.useMemo(() => {
    const map = new Map();
    for (const r of todayLogs) {
      if (r.status === "IN" && !map.has(r.userId)) map.set(r.userId, r);
    }
    return map;
  }, [todayLogs]);

  const presentUserIds = React.useMemo(() => new Set(todayLogs.filter((r) => r.status === "IN").map((r) => r.userId)), [todayLogs]);
  const presentUsers = React.useMemo(() => {
    const result = [];
    const seen = new Set();
    for (const r of todayLogs) {
      if (r.status === "IN" && !seen.has(r.userId)) {
        seen.add(r.userId);
        const user = users.find((u) => u.id === r.userId);
        result.push({ ...r, department: user?.department ?? "—" });
      }
    }
    return result.sort((a, b) => (a.logTime || "").localeCompare(b.logTime || ""));
  }, [todayLogs, users]);

  const lateUsers = React.useMemo(() => {
    const result = [];
    for (const [userId, record] of userFirstIn) {
      const [h, m] = (record.logTime || "00:00").split(":").map(Number);
      if (h * 60 + m > 8 * 60) {
        const user = users.find((u) => u.id === userId);
        result.push({ ...record, department: user?.department ?? "—" });
      }
    }
    return result.sort((a, b) => (a.logTime || "").localeCompare(b.logTime || ""));
  }, [userFirstIn, users]);

  const absentUsers = React.useMemo(() => {
    return activeUsers
      .filter((u) => !presentUserIds.has(u.id))
      .map((u) => ({ id: u.id, name: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" "), role: u.role, department: u.department ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeUsers, presentUserIds]);

  const departmentStats = React.useMemo(() => {
    const stats = new Map();
    for (const user of activeUsers) {
      const dept = user.department || "Unassigned";
      if (!stats.has(dept)) stats.set(dept, { department: dept, total: 0, present: 0, late: 0, absent: 0 });
      stats.get(dept).total++;
    }
    for (const [userId, record] of userFirstIn) {
      const user = users.find((u) => u.id === userId);
      if (!user) continue;
      const dept = user.department || "Unassigned";
      if (!stats.has(dept)) stats.set(dept, { department: dept, total: 0, present: 0, late: 0, absent: 0 });
      stats.get(dept).present++;
      const [h, m] = (record.logTime || "00:00").split(":").map(Number);
      if (h * 60 + m > 8 * 60) stats.get(dept).late++;
    }
    for (const [, s] of stats) s.absent = Math.max(0, s.total - s.present);
    return Array.from(stats.values()).filter((d) => d.total > 0).sort((a, b) => b.total - a.total);
  }, [activeUsers, userFirstIn, users]);

  const dailyChart = React.useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = getManilaDate(6 - i);
      const logs = weekLogs[dateStr] || [];
      const uniquePresent = new Set(logs.filter((r) => r.status === "IN").map((r) => r.userId)).size;
      const d = new Date(dateStr + "T12:00:00");
      return { day: dayNames[d.getDay()], date: dateStr, present: uniquePresent };
    });
  }, [weekLogs]);

  const totalIn = React.useMemo(() => todayLogs.filter((r) => r.status === "IN").length, [todayLogs]);
  const totalOut = React.useMemo(() => todayLogs.filter((r) => r.status === "OUT").length, [todayLogs]);

  /* ── Export ── */
  const handleExport = React.useCallback(() => {
    const rows = [];
    const now = new Date();
    const dateStr = getManilaDate(0);
    const ts = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    rows.push(["Francis Key Dashboard Export"]);
    rows.push(["Generated", ts]);
    rows.push([]);
    rows.push(["=== SYSTEM SUMMARY ==="]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Users", users.length]);
    rows.push(["Active Users", activeUsers.length]);
    rows.push(["Faculty", faculty.length]);
    rows.push(["Students", students.length]);
    rows.push(["Today's Attendance Records", todayLogs.length]);
    rows.push([]);
    rows.push(["=== ATTENDANCE STATISTICS ==="]);
    rows.push(["Present", presentUsers.length]);
    rows.push(["Late", lateUsers.length]);
    rows.push(["Absent", absentUsers.length]);
    rows.push(["Total IN", totalIn]);
    rows.push(["Total OUT", totalOut]);
    rows.push([]);
    rows.push(["=== ATTENDANCE BY DEPARTMENT ==="]);
    rows.push(["Department", "Total", "Present", "Late", "Absent"]);
    departmentStats.forEach((d) => rows.push([d.department, d.total, d.present, d.late, d.absent]));
    rows.push([]);
    rows.push(["=== PRESENT USERS ==="]);
    rows.push(["Name", "Role", "Department", "Time In"]);
    presentUsers.forEach((u) => rows.push([u.name, u.role, u.department, formatTime(u.logTime)]));
    rows.push([]);
    rows.push(["=== LATE USERS ==="]);
    rows.push(["Name", "Role", "Department", "Time In"]);
    lateUsers.forEach((u) => rows.push([u.name, u.role, u.department, formatTime(u.logTime)]));
    rows.push([]);
    rows.push(["=== ABSENT USERS ==="]);
    rows.push(["Name", "Role", "Department"]);
    absentUsers.forEach((u) => rows.push([u.name, u.role, u.department]));
    const csv = rows.map((row) => row.map((c) => { const s = String(c ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `francis-key-dashboard-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [users, activeUsers, faculty, students, todayLogs, presentUsers, lateUsers, absentUsers, totalIn, totalOut, departmentStats]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-up space-y-6">
      <HeaderBlock
        title="Dashboard & Monitoring"
        description="System overview and attendance summary for today."
        rightContent={
          <button onClick={handleExport} className="btn btn-secondary inline-flex items-center gap-2 text-sm">
            <FileBarChart size={16} />
            Export CSV
          </button>
        }
      />

      {error ? (
        <div className="alert alert-error">
          <p className="font-semibold">Failed to load dashboard</p>
          <p className="mt-1 text-xs opacity-80">{error}</p>
        </div>
      ) : null}

      {/* Section 1: System Dashboard */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Users", value: users.length, hint: `${activeUsers.length} active`, color: "green" },
          { label: "Faculty Members", value: faculty.length, hint: `${faculty.filter((u) => u.status === "Active").length} active`, color: "blue" },
          { label: "Students", value: students.length, hint: `${students.filter((u) => u.status === "Active").length} active`, color: "purple" },
          { label: "Today's Attendance", value: todayLogs.length, hint: `${presentUsers.length} present`, color: "amber" },
        ].map((m) => (
          <article key={m.label} className="card-elevated p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{m.label}</div>
            <div className="mt-3 text-2xl font-bold text-gray-800">{m.value}</div>
            <div className="mt-1.5 text-sm text-gray-500">{m.hint}</div>
          </article>
        ))}
      </section>

      {/* Sections 2 & 3: Attendance Statistics + User Activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card-elevated p-5">
          <h2 className="text-lg font-semibold text-gray-800">Attendance Statistics</h2>
          <p className="mt-1 text-sm text-gray-500">Today's attendance breakdown.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Present", value: presentUsers.length, color: "text-green-600 bg-green-50" },
              { label: "Late", value: lateUsers.length, color: "text-amber-600 bg-amber-50" },
              { label: "Absent", value: absentUsers.length, color: "text-red-600 bg-red-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="mt-1 text-xs font-medium opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <span>IN scans: <strong className="text-gray-700">{totalIn}</strong></span>
            <span>OUT scans: <strong className="text-gray-700">{totalOut}</strong></span>
          </div>
        </article>

        <article className="card-elevated p-5">
          <h2 className="text-lg font-semibold text-gray-800">User Activity Summary</h2>
          <p className="mt-1 text-sm text-gray-500">Active users who logged attendance today.</p>
          <div className="mt-6 flex items-end gap-6">
            <div>
              <div className="text-4xl font-bold text-green-600">{presentUsers.length}</div>
              <div className="mt-1 text-sm text-gray-500">Logged in today</div>
            </div>
            <div className="mb-1 text-sm text-gray-500">of <strong className="text-gray-700">{activeUsers.length}</strong> active users</div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${activeUsers.length ? Math.round((presentUsers.length / activeUsers.length) * 100) : 0}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {activeUsers.length ? Math.round((presentUsers.length / activeUsers.length) * 100) : 0}% attendance rate
          </div>
        </article>
      </section>

      {/* Section 4: Attendance by Department */}
      <article className="card-elevated p-5">
        <h2 className="text-lg font-semibold text-gray-800">Attendance by Department</h2>
        <p className="mt-1 text-sm text-gray-500">Attendance breakdown per department for today.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
                <th className="px-4 py-3 font-medium text-center">Present</th>
                <th className="px-4 py-3 font-medium text-center">Late</th>
                <th className="px-4 py-3 font-medium text-center">Absent</th>
                <th className="px-4 py-3 font-medium text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.length ? departmentStats.map((row) => (
                <tr key={row.department} className="border-b border-gray-50 transition hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.department}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.total}</td>
                  <td className="px-4 py-3 text-center"><span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">{row.present}</span></td>
                  <td className="px-4 py-3 text-center"><span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{row.late}</span></td>
                  <td className="px-4 py-3 text-center"><span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{row.absent}</span></td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{row.total ? Math.round((row.present / row.total) * 100) : 0}%</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No department data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Section 5: Daily Attendance Summary — Chart */}
      <article className="card-elevated p-5">
        <h2 className="text-lg font-semibold text-gray-800">Daily Attendance Summary</h2>
        <p className="mt-1 text-sm text-gray-500">Unique attendees over the past 7 days.</p>
        <div className="mt-4" style={{ height: 300 }}>
          {dailyChart.some((d) => d.present > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: "0.875rem" }}
                  formatter={(value) => [value, "Unique Attendees"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Bar dataKey="present" fill="#16a34a" radius={[4, 4, 0, 0]} name="Unique Attendees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">No attendance data for the past 7 days.</div>
          )}
        </div>
      </article>

      {/* Section 6, 7, 8: Present / Late / Absent Users */}
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { title: "Present Users", data: presentUsers, badge: "badge-green", empty: "No users have clocked in today." },
          { title: "Late Users", data: lateUsers, badge: "badge", empty: "No users arrived late today." },
          { title: "Absent Users", data: absentUsers, badge: "badge", empty: "All active users are present today." },
        ].map((section) => (
          <article key={section.title} className="card-elevated p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">{section.title}</h2>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", section.badge)}>{section.data.length}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[0.65rem] uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Dept</th>
                    {section.title !== "Absent Users" && <th className="px-3 py-2 font-medium">Time</th>}
                  </tr>
                </thead>
                <tbody>
                  {section.data.length ? section.data.slice(0, 15).map((u, i) => (
                    <tr key={u.userId || u.id || i} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{u.name}</td>
                      <td className="px-3 py-2 text-gray-600">{u.department ?? "—"}</td>
                      {section.title !== "Absent Users" && (
                        <td className="px-3 py-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[0.65rem] font-medium text-green-700">{formatTime(u.logTime)}</span></td>
                      )}
                    </tr>
                  )) : (
                    <tr><td colSpan={section.title !== "Absent Users" ? 4 : 3} className="px-3 py-6 text-center text-gray-400">{section.empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>

      {/* Sections 9 & 10: Smart Cards & Fingerprints */}
      <section className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Registered Smart Cards", data: smartCardUsers, idField: "smartCardId", empty: "No smart cards registered." },
          { title: "Registered Fingerprints", data: fingerprintUsers, idField: "fingerprintId", empty: "No fingerprints registered." },
        ].map((section) => (
          <article key={section.title} className="card-elevated p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">{section.title}</h2>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{section.data.length}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[0.65rem] uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">{section.idField === "smartCardId" ? "Card ID" : "Fingerprint ID"}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.data.length ? section.data.slice(0, 15).map((u, i) => (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{[u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ")}</td>
                      <td className="px-3 py-2 capitalize text-gray-600">{u.role}</td>
                      <td className="px-3 py-2 font-mono text-gray-600">{u[section.idField]}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">{section.empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>

      {/* Section 11: Export (button in header already, secondary trigger here) */}
      <section className="flex justify-end">
        <button onClick={handleExport} className="btn btn-primary inline-flex items-center gap-2 text-sm">
          <FileBarChart size={16} />
          Export Dashboard Data (CSV)
        </button>
      </section>
    </div>
  );
}

function RolePanel({ pageKey, role }) {
  const isDashboard = pageKey === "dashboard";
  // Dashboard fetches real data immediately — skip mock loading so the table renders without flicker
  const mockLoading = useMockLoading(isDashboard ? null : 3000, `${role}-${pageKey}`);
  const data = panelContent[pageKey];

  // Attendance logs state
  const [attendanceLogs, setAttendanceLogs] = React.useState([]);
  const [attendanceFilterDate, setAttendanceFilterDate] = React.useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [attendanceLoading, setAttendanceLoading] = React.useState(false);
  const [attendanceError, setAttendanceError] = React.useState("");
  const [attendanceTotal, setAttendanceTotal] = React.useState(0);
  const [attendancePage, setAttendancePage] = React.useState(1);
  const pageSize = 15;

  const fetchAttendanceLogs = React.useCallback(async (date, page) => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
      if (date) params.set("date", date);

      const result = await apiFetch(`/attendance.php?${params.toString()}`);
      setAttendanceLogs(Array.isArray(result.records) ? result.records : []);
      setAttendanceTotal(result.total ?? 0);
    } catch (err) {
      setAttendanceLogs([]);
      setAttendanceTotal(0);
      setAttendanceError(err.message || "Failed to load attendance logs.");
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Fetch attendance logs for dashboard — loads data immediately without page refresh
  React.useEffect(() => {
    if (isDashboard) {
      setAttendancePage(1);
      fetchAttendanceLogs(attendanceFilterDate, 1);
    }
  }, [isDashboard, attendanceFilterDate, fetchAttendanceLogs]);

  React.useEffect(() => {
    if (isDashboard && attendancePage > 1) {
      fetchAttendanceLogs(attendanceFilterDate, attendancePage);
    }
  }, [isDashboard, attendancePage, attendanceFilterDate, fetchAttendanceLogs]);

  const totalAttendancePages = Math.max(1, Math.ceil(attendanceTotal / pageSize));

  function formatAttendanceTime(logTime) {
    if (!logTime || !/^\d{2}:\d{2}/.test(logTime)) return logTime || "No Record";
    const [hoursText, minutesText] = logTime.slice(0, 5).split(":");
    const hours = Number(hoursText);
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${minutesText} ${suffix}`;
  }

  function attendanceMethod(source) {
    return source === "esp32" || source === "esp32-sync" ? "Fingerprint + Card" : source;
  }

  // Dashboard metrics derived from real data
  const dashboardMetrics = React.useMemo(() => {
    if (!isDashboard || !attendanceLogs.length) return data.metrics;

    const timeInCount = attendanceLogs.filter((r) => r.status === "IN").length;
    const uniqueNames = new Set(attendanceLogs.map((r) => r.name)).size;

    return [
      { label: "Today's Time-ins", value: String(timeInCount), hint: `${uniqueNames} unique individuals` },
      { label: "Connected Biometric Scanners", value: "18 / 20", hint: "2 under maintenance" },
      { label: "Smart Card Reads", value: String(attendanceLogs.length), hint: `Latest at ${attendanceLogs[0]?.logTime?.slice(0, 5) || "N/A"}` },
      { label: "Attendance Accuracy", value: "99.3%", hint: "Validated entries only" },
    ];
  }, [isDashboard, attendanceLogs, data.metrics]);

  const groupedLogs = React.useMemo(() => {
    if (!isDashboard || !attendanceLogs.length) return [];
    const map = new Map();
    for (const row of attendanceLogs) {
      const key = row.idNumber || row.name;
      if (!map.has(key)) {
        map.set(key, { idNumber: row.idNumber, name: row.name, timeIn: null, timeOut: null });
      }
      const entry = map.get(key);
      if (row.status === "IN" && !entry.timeIn) entry.timeIn = row.logTime;
      if (row.status === "OUT" && !entry.timeOut) entry.timeOut = row.logTime;
    }
    return Array.from(map.values());
  }, [isDashboard, attendanceLogs]);

  if (mockLoading) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-up space-y-4">
      <section className="hero-card overflow-hidden p-6 sm:p-7">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{data.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">{data.description}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className="card-elevated p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{metric.label}</div>
            <div className="mt-3 text-2xl font-semibold text-gray-800">{metric.value}</div>
            <div className="mt-2 text-sm text-gray-500">{metric.hint}</div>
          </article>
        ))}
      </section>

      {isDashboard ? (
        <section>
          <article className="card-elevated p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Attendance Logs</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={attendanceFilterDate}
                  onChange={(e) => setAttendanceFilterDate(e.target.value)}
                  className="form-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm sm:flex-initial"
                />
                <button
                  type="button"
                  onClick={() => fetchAttendanceLogs(attendanceFilterDate, attendancePage)}
                  disabled={attendanceLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                  title="Refresh attendance logs"
                >
                  <RefreshCw size={16} className={attendanceLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {attendanceError ? (
              <div className="mt-5 alert alert-error text-center">
                <p className="text-sm font-semibold">Failed to load attendance logs</p>
                <p className="mt-2 text-xs text-gray-500">{attendanceError}</p>
                <button
                  type="button"
                  onClick={() => fetchAttendanceLogs(attendanceFilterDate, attendancePage)}
                  className="btn btn-secondary mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : attendanceLoading ? (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Loading attendance logs...
              </div>
            ) : (
              <>
                <div className="mt-4 table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID Number</th>
                        <th>Name</th>
                        <th>Time-IN</th>
                        <th>Time-out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedLogs.length ? (
                        groupedLogs.map((row, idx) => (
                          <tr key={row.idNumber || idx}>
                            <td>{row.idNumber ?? "N/A"}</td>
                            <td className="font-medium text-gray-800">{row.name}</td>
                            <td>
                              <span className="time-in-badge">
                                {formatAttendanceTime(row.timeIn)}
                              </span>
                            </td>
                            <td>
                              <span className="time-out-badge">
                                {formatAttendanceTime(row.timeOut)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                            No attendance records found{attendanceFilterDate ? ` for ${attendanceFilterDate}` : ""}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{groupedLogs.length}</span> entries
                    {attendanceFilterDate ? (
                      <>
                        {" "}on{" "}
                        <span className="font-medium text-gray-700">{attendanceFilterDate}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
                      disabled={attendancePage === 1}
                      className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendancePage((p) => Math.min(totalAttendancePages, p + 1))}
                      disabled={attendancePage === totalAttendancePages}
                      className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>

        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="card-elevated p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Recent Attendance Feed</h2>
              <span className="badge badge-green text-[0.65rem] uppercase tracking-wider">Real-Time</span>
            </div>

            <div className="mt-5 table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleAttendance.map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium text-gray-800">{row.name}</td>
                      <td>{row.role}</td>
                      <td>{row.method}</td>
                      <td>
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{row.status}</span>
                      </td>
                      <td>{row.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card-elevated p-5">
            <h2 className="text-lg font-semibold text-gray-800">Operational Notes</h2>
            <div className="mt-5 space-y-3">
              {[
                "The new visual system uses one shared palette so the whole project feels like a single product.",
                "All key calls to action now use brighter contrast for cleaner focus and clearer user flow.",
                "Dashboard panels and forms now share matching surfaces, borders, and icon styling.",
                "Your routing and data behavior stay intact, so the redesign is mostly visual and UX-oriented.",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

function ClassSubjectPage() {
  const [subjects, setSubjects] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState(emptyClassSubjectForm);
  const [editingId, setEditingId] = React.useState(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingSubject, setDeletingSubject] = React.useState(null);
  const [pageError, setPageError] = React.useState("");

  const loadSubjects = React.useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const data = await apiFetch(`/class-subjects.php`);
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      setPageError(error.message || "Failed to load class subjects.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const resetForm = React.useCallback(() => {
    setForm(emptyClassSubjectForm);
    setEditingId(null);
    setIsSubjectModalOpen(false);
  }, []);

  const validateClassSubject = React.useCallback(
    (payload) => {
      const normalizedCode = payload.subjectCode.trim().toUpperCase();
      const normalizedName = payload.subjectName.trim().toUpperCase();

      if (!normalizedCode) return "Subject code required";
      if (!payload.subjectName.trim()) return "Subject name is required";
      if (!payload.yearLevel) return "Year level is required";
      if (!payload.semester) return "Semister is required";

      const duplicate = subjects.find(
        (subject) =>
          subject.id !== editingId && String(subject.subjectCode ?? "").trim().toUpperCase() === normalizedCode,
      );

      if (duplicate) return "Subject code already exist";

      const duplicateName = subjects.find(
        (subject) =>
          subject.id !== editingId && String(subject.subjectName ?? "").trim().toUpperCase() === normalizedName,
      );

      if (duplicateName) return "Subject Name already exist";
      return "";
    },
    [editingId, subjects],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateClassSubject(form);
    if (validationError) {
      setFeedback({ message: validationError, tone: "error" });
      return;
    }

    const payload = {
      subjectCode: form.subjectCode.trim().toUpperCase(),
      subjectName: form.subjectName.trim(),
      yearLevel: form.yearLevel,
      semester: form.semester,
    };

    try {
      setSaving(true);
      const data = await apiFetch(`/class-subjects.php`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      setSubjects((prev) => {
        if (editingId) {
          return prev
            .map((subject) => (subject.id === data.id ? data : subject))
            .sort((left, right) => String(left.subjectCode).localeCompare(String(right.subjectCode)));
        }
        return [...prev, data].sort((left, right) => String(left.subjectCode).localeCompare(String(right.subjectCode)));
      });
      setFeedback({
        message: editingId ? "Class subject updated successfully." : "Class subject added successfully.",
        tone: "success",
      });
      resetForm();
    } catch (error) {
      setFeedback({ message: error.message || "Unable to save class subject.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingId(subject.id);
    setForm({
      subjectCode: subject.subjectCode ?? "",
      subjectName: subject.subjectName ?? "",
      yearLevel: subject.yearLevel ?? "",
      semester: subject.semester ?? "",
    });
    setIsSubjectModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;

    try {
      await apiFetch(`/class-subjects.php?id=${encodeURIComponent(deletingSubject.id)}`, {
        method: "DELETE",
      });

      setSubjects((prev) => prev.filter((subject) => subject.id !== deletingSubject.id));
      if (editingId === deletingSubject.id) resetForm();
      setFeedback({ message: "Class subject deleted successfully.", tone: "success" });
      setDeletingSubject(null);
    } catch (error) {
      setFeedback({ message: error.message || "Failed to delete class subject.", tone: "error" });
    }
  };

  const filteredSubjects = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return subjects;

    return subjects.filter((subject) => {
      const haystack = [
        subject.subjectCode,
        subject.subjectName,
        subject.yearLevel,
        subject.semester,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [search, subjects]);

  const sectionedSubjects = React.useMemo(() => {
    const sortedSubjects = [...filteredSubjects].sort((left, right) => {
      const yearCompare = (yearLevelOrder[left.yearLevel] ?? Number.MAX_SAFE_INTEGER) - (yearLevelOrder[right.yearLevel] ?? Number.MAX_SAFE_INTEGER);
      if (yearCompare !== 0) return yearCompare;

      const semesterCompare = (semesterOrder[left.semester] ?? Number.MAX_SAFE_INTEGER) - (semesterOrder[right.semester] ?? Number.MAX_SAFE_INTEGER);
      if (semesterCompare !== 0) return semesterCompare;

      const codeCompare = String(left.subjectCode ?? "").localeCompare(String(right.subjectCode ?? ""));
      if (codeCompare !== 0) return codeCompare;

      const nameCompare = String(left.subjectName ?? "").localeCompare(String(right.subjectName ?? ""));
      if (nameCompare !== 0) return nameCompare;

      return Number(left.id ?? 0) - Number(right.id ?? 0);
    });

    return academicSections
      .map((section) => ({
        ...section,
        key: `${section.yearLevel}-${section.semester}`,
        items: sortedSubjects.filter(
          (subject) => subject.yearLevel === section.yearLevel && subject.semester === section.semester,
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [filteredSubjects]);

  return (
    <div className="space-y-4">
      <HeaderBlock
        rightContent={(
          <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px] md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
            <div className="w-full">
              <Field
                label="Search Subject"
                hideLabel
                value={search}
                placeholder="Search subject code, name, year level, or semister"
                onChange={setSearch}
                small
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyClassSubjectForm);
                setIsSubjectModalOpen(true);
              }}
              className="btn btn-secondary whitespace-nowrap"
            >
              Add Subject
            </button>
          </div>
        )}
      />

      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <div className="grid gap-4">
        <FormCard
          title="Subject Records"
        >
          {pageError ? (
            <div className="alert alert-error">
              {pageError}
            </div>
          ) : null}

          <div className="table-container">
            <table className="min-w-full text-left text-sm">
              <thead className="">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="w-[1%] px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
                      Loading class subjects...
                    </td>
                  </tr>
                ) : sectionedSubjects.length ? (
                  sectionedSubjects.map((section) => (
                    <React.Fragment key={section.key}>
                      <tr className="table-section-row">
                        <td colSpan="3" className="px-4 py-2 text-center font-semibold">
                          {section.label}
                        </td>
                      </tr>
                      {section.items.map((subject) => (
                        <tr key={subject.id}>
                          <td className="px-4 py-3 font-semibold text-gray-800">{subject.subjectCode}</td>
                          <td className="px-4 py-3">{subject.subjectName}</td>
                          <td className="w-[1%] px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEdit(subject)}
                                className="btn btn-secondary text-xs text-green-700 border-green-200 bg-green-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSubject(subject)}
                                className="btn btn-danger text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
                      {search.trim() ? "No matching class subjects found." : "No class subjects found yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </FormCard>
      </div>

      {isSubjectModalOpen ? (
        <div className="modal-overlay">
          <div className="my-auto w-full max-w-2xl">
            <FormCard
              title={editingId ? "Edit Class Subject" : "Add Class Subject"}
            >
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Subject Code"
                  value={form.subjectCode}
                  onChange={(value) => setForm((prev) => ({ ...prev, subjectCode: value }))}
                  placeholder="Enter subject code"
                  required
                />
                <Field
                  label="Subject Name"
                  value={form.subjectName}
                  onChange={(value) => setForm((prev) => ({ ...prev, subjectName: value }))}
                  placeholder="Enter subject name"
                  required
                />
                <SelectField
                  label="Year Level"
                  value={form.yearLevel}
                  onChange={(value) => setForm((prev) => ({ ...prev, yearLevel: value }))}
                  options={[
                    { label: "Select year level", value: "" },
                    { label: "1st Year", value: "1st Year" },
                    { label: "2nd Year", value: "2nd Year" },
                    { label: "3rd Year", value: "3rd Year" },
                    { label: "4th Year", value: "4th Year" },
                  ]}
                  required
                />
                <SelectField
                  label="Semister"
                  value={form.semester}
                  onChange={(value) => setForm((prev) => ({ ...prev, semester: value }))}
                  options={[
                    { label: "Select semister", value: "" },
                    { label: "1st Sem", value: "1st Sem" },
                    { label: "2nd Sem", value: "2nd Sem" },
                  ]}
                  required
                />

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? (editingId ? "Updating..." : "Saving...") : editingId ? "Update Subject" : "Add Subject"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary"
                  >
                    {editingId ? "Cancel Edit" : "Close"}
                  </button>
                </div>
              </form>
            </FormCard>
          </div>
        </div>
      ) : null}

      {deletingSubject ? (
        <div className="modal-overlay">
          <div className="my-auto w-full max-w-md">
            <FormCard
              title="Delete Class Subject"
              subtitle={`Are you sure you want to delete ${deletingSubject.subjectCode} - ${deletingSubject.subjectName}?`}
            >
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-danger"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSubject(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </FormCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClassSchedulingPage() {
  const [form, setForm] = React.useState({
    section: "",
    yearLevel: "",
    semester: "",
    days: [],
  });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState(null);
  const [deletingSchedule, setDeletingSchedule] = React.useState(null);
  const [subjectEntries, setSubjectEntries] = React.useState([]);
  const [overlapSubjectIds, setOverlapSubjectIds] = React.useState([]);
  const [scheduleRows, setScheduleRows] = React.useState([]);
  const [loadingRows, setLoadingRows] = React.useState(true);
  const [loadingSubjects, setLoadingSubjects] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [pageError, setPageError] = React.useState("");

  const loadScheduleRows = React.useCallback(async () => {
    try {
      setLoadingRows(true);
      setPageError("");
      const data = await apiFetch(`/class-schedules.php`);
      setScheduleRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setPageError(error.message || "Failed to load class schedules.");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  React.useEffect(() => {
    loadScheduleRows();
  }, [loadScheduleRows]);

  React.useEffect(() => {
    if (!form.yearLevel || !form.semester) {
      setSubjectEntries([]);
      setOverlapSubjectIds([]);
      return;
    }

    let isMounted = true;

    const loadSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const params = new URLSearchParams({
          yearLevel: form.yearLevel,
          semester: form.semester,
        });
        const data = await apiFetch(`/class-schedules.php?${params.toString()}`);
        if (!isMounted) return;

        const nextEntries = Array.isArray(data.subjects)
          ? data.subjects.map((subject) => ({
              subjectId: subject.id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              startTime:
                editingSchedule?.yearLevel === form.yearLevel && editingSchedule?.semester === form.semester
                  ? normalizeTimeInputValue(
                      editingSchedule.items.find((item) => Number(item.subjectId) === Number(subject.id))?.startTime,
                    )
                  : "",
              endTime:
                editingSchedule?.yearLevel === form.yearLevel && editingSchedule?.semester === form.semester
                  ? normalizeTimeInputValue(
                      editingSchedule.items.find((item) => Number(item.subjectId) === Number(subject.id))?.endTime,
                    )
                  : "",
            }))
          : [];

        setSubjectEntries(nextEntries);
        setOverlapSubjectIds([]);
      } catch (error) {
        if (!isMounted) return;
        setSubjectEntries([]);
        setOverlapSubjectIds([]);
        setFeedback({ message: error.message || "Failed to load subjects for scheduling.", tone: "error" });
      } finally {
        if (isMounted) {
          setLoadingSubjects(false);
        }
      }
    };

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, [editingSchedule, form.yearLevel, form.semester]);

  const validateSchedule = React.useCallback(() => {
    if (!form.section) return "Section is required";
    if (!form.yearLevel) return "Year level is required";
    if (!form.semester) return "Semester is required";
    if (!form.days.length) return "Please select at least one day.";
    if (!subjectEntries.length) return "No subjects are available for the selected year level and semester.";

    const windows = [];
    for (const entry of subjectEntries) {
      if (!entry.startTime || !entry.endTime) return "Start and end times are required";

      const start = parseTimeToMinutes(entry.startTime);
      const end = parseTimeToMinutes(entry.endTime);

      if (start === null || end === null) return "Start and end times are required";
      if (end - start < 60) return "Start and end times must be at least 1 hour apart";

      windows.push({
        subjectId: entry.subjectId,
        start,
        end,
      });
    }

    windows.sort((left, right) => left.start - right.start);
    for (let index = 1; index < windows.length; index += 1) {
      if (windows[index].start < windows[index - 1].end) {
        setOverlapSubjectIds([windows[index - 1].subjectId, windows[index].subjectId]);
        return "Schedule times must not overlap.";
      }
    }

    setOverlapSubjectIds([]);

    for (const window of windows) {
      const subjectConflict = scheduleRows.find((row) => {
        if (Number(row.subjectId) !== Number(window.subjectId)) return false;

        const isSameEditingGroup =
          editingSchedule &&
          row.section === editingSchedule.section &&
          row.yearLevel === editingSchedule.yearLevel &&
          row.semester === editingSchedule.semester;
        if (isSameEditingGroup) return false;

        const rowStart = parseTimeToMinutes(normalizeTimeInputValue(row.startTime));
        const rowEnd = parseTimeToMinutes(normalizeTimeInputValue(row.endTime));
        if (rowStart === null || rowEnd === null) return false;

        const rowDays = Array.isArray(row.days) ? row.days : [];
        const sameDay = rowDays.some((day) => form.days.includes(day));

        return sameDay && rowStart < window.end && rowEnd > window.start;
      });

      if (subjectConflict) {
        return `This subject is already scheduled for Section ${subjectConflict.section} at this time.`;
      }
    }

    const duplicateSectionSchedule = scheduleRows.some(
      (row) =>
        row.section === form.section &&
        row.yearLevel === form.yearLevel &&
        row.semester === form.semester &&
        (!editingSchedule ||
          row.section !== editingSchedule.section ||
          row.yearLevel !== editingSchedule.yearLevel ||
          row.semester !== editingSchedule.semester),
    );
    if (duplicateSectionSchedule) {
      return `Section ${form.section} already has a schedule for ${form.yearLevel} (${form.semester}).`;
    }

    return "";
  }, [editingSchedule, form, scheduleRows, subjectEntries]);

  const groupedScheduleRows = React.useMemo(() => {
    const sortedRows = [...scheduleRows].sort((left, right) => {
      const sectionCompare = String(left.section ?? "").localeCompare(String(right.section ?? ""));
      if (sectionCompare !== 0) return sectionCompare;

      const yearCompare = (yearLevelOrder[left.yearLevel] ?? Number.MAX_SAFE_INTEGER) - (yearLevelOrder[right.yearLevel] ?? Number.MAX_SAFE_INTEGER);
      if (yearCompare !== 0) return yearCompare;

      const semesterCompare = (semesterOrder[left.semester] ?? Number.MAX_SAFE_INTEGER) - (semesterOrder[right.semester] ?? Number.MAX_SAFE_INTEGER);
      if (semesterCompare !== 0) return semesterCompare;

      return String(left.startTime ?? "").localeCompare(String(right.startTime ?? ""));
    });

    return sortedRows.reduce((groups, row) => {
      const key = `${row.section}-${row.yearLevel}-${row.semester}`;
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.items.push(row);
      } else {
        groups.push({
          key,
          section: row.section,
          yearLevel: row.yearLevel,
          semester: row.semester,
          days: Array.isArray(row.days) ? row.days : [],
          label: `Section ${row.section} - ${row.yearLevel} (${row.semester})`,
          items: [row],
        });
      }

      return groups;
    }, []);
  }, [scheduleRows]);

  const handleEntryChange = (subjectId, field, value) => {
    setOverlapSubjectIds((prev) => prev.filter((id) => id !== subjectId));
    setSubjectEntries((prev) =>
      prev.map((entry) => (entry.subjectId === subjectId ? { ...entry, [field]: value } : entry)),
    );
  };

  const resetScheduleForm = React.useCallback(() => {
    setForm({ section: "", yearLevel: "", semester: "", days: [] });
    setSubjectEntries([]);
    setOverlapSubjectIds([]);
    setEditingSchedule(null);
    setIsScheduleModalOpen(false);
  }, []);

  const handleEditSchedule = (group) => {
    setEditingSchedule(group);
    setDeletingSchedule(null);
    setForm({
      section: group.section ?? "",
      yearLevel: group.yearLevel ?? "",
      semester: group.semester ?? "",
      days: Array.isArray(group.days) ? group.days : [],
    });
    setSubjectEntries([]);
    setOverlapSubjectIds([]);
    setIsScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return;

    try {
      const params = new URLSearchParams({
        section: deletingSchedule.section,
        yearLevel: deletingSchedule.yearLevel,
        semester: deletingSchedule.semester,
      });
      const data = await apiFetch(`/class-schedules.php?${params.toString()}`, {
        method: "DELETE",
      });

      setScheduleRows(Array.isArray(data.rows) ? data.rows : []);
      setFeedback({ message: data.message || "Class schedule deleted successfully.", tone: "success" });
      if (
        editingSchedule &&
        editingSchedule.section === deletingSchedule.section &&
        editingSchedule.yearLevel === deletingSchedule.yearLevel &&
        editingSchedule.semester === deletingSchedule.semester
      ) {
        resetScheduleForm();
      }
      setDeletingSchedule(null);
    } catch (error) {
      setFeedback({ message: error.message || "Failed to delete the class schedule.", tone: "error" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateSchedule();
    if (validationError) {
      setFeedback({ message: validationError, tone: "error" });
      return;
    }

    try {
      setSaving(true);
      const data = await apiFetch(`/class-schedules.php`, {
        method: editingSchedule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingSchedule
            ? {
                originalSection: editingSchedule.section,
                originalYearLevel: editingSchedule.yearLevel,
                originalSemester: editingSchedule.semester,
              }
            : {}),
          section: form.section,
          yearLevel: form.yearLevel,
          semester: form.semester,
          days: form.days,
          entries: subjectEntries.map((entry) => ({
            subjectId: entry.subjectId,
            startTime: normalizeTimeInputValue(entry.startTime),
            endTime: normalizeTimeInputValue(entry.endTime),
          })),
        }),
      });

      setScheduleRows(Array.isArray(data.rows) ? data.rows : []);
      setFeedback({
        message: data.message || (editingSchedule ? "Class schedule updated successfully." : "Class schedule saved successfully."),
        tone: "success",
      });
      resetScheduleForm();
    } catch (error) {
      setFeedback({
        message: error.message || (editingSchedule ? "Failed to update the class schedule." : "Failed to save the class schedule."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <HeaderBlock
        rightContent={(
          <button
            type="button"
            onClick={() => {
              setEditingSchedule(null);
              setDeletingSchedule(null);
              setForm({ section: "", yearLevel: "", semester: "", days: [] });
              setSubjectEntries([]);
              setOverlapSubjectIds([]);
              setIsScheduleModalOpen(true);
            }}
            className="btn btn-secondary whitespace-nowrap"
          >
            Add Schedule
          </button>
        )}
      />

      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <div className="grid gap-4">
        <FormCard title="Schedule Records">
          {pageError ? (
            <div className="alert alert-error">
              {pageError}
            </div>
          ) : null}

          <div className="table-container">
            <table className="min-w-full text-left text-sm">
              <thead className="">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="w-[1%] px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                      Loading class schedules...
                    </td>
                  </tr>
                ) : groupedScheduleRows.length ? (
                  groupedScheduleRows.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="table-section-row">
                        <td colSpan="5" className="px-4 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-center font-semibold sm:text-left">{group.label}</div>
                            <div className="inline-flex items-center justify-center gap-2 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(group)}
                                className="btn btn-secondary text-xs text-green-700 border-green-200 bg-green-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSchedule(group)}
                                className="btn btn-danger text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {group.items.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-semibold text-gray-800">{row.subjectCode}</td>
                          <td className="px-4 py-3">{row.subjectName}</td>
                          <td className="px-4 py-3">{formatScheduleDays(row.days)}</td>
                          <td className="px-4 py-3">{formatTimeRange(row.startTime, row.endTime)}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                      No class schedules found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </FormCard>
      </div>

      {isScheduleModalOpen ? (
        <div className="modal-overlay">
            <div className="my-auto w-full max-w-2xl py-4">
              <FormCard title={editingSchedule ? "Edit Schedule" : "Add Schedule"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <SelectField
                    label="Section"
                    value={form.section}
                    onChange={(value) => setForm((prev) => ({ ...prev, section: value }))}
                    options={[
                      { label: "Select section", value: "" },
                      ...sectionOptions.map((section) => ({ label: section, value: section })),
                    ]}
                    required
                  />
                  <SelectField
                    label="Year Level"
                    value={form.yearLevel}
                    onChange={(value) => setForm((prev) => ({ ...prev, yearLevel: value }))}
                    options={[
                      { label: "Select year level", value: "" },
                      ...yearLevelOptions.map((yearLevel) => ({ label: yearLevel, value: yearLevel })),
                    ]}
                    required
                  />
                  <SelectField
                    label="Semister"
                    value={form.semester}
                    onChange={(value) => setForm((prev) => ({ ...prev, semester: value }))}
                    options={[
                      { label: "Select semister", value: "" },
                      ...semesterOptions.map((semester) => ({ label: semester, value: semester })),
                    ]}
                    required
                  />
                  <CheckboxGroup
                    label="Days"
                    options={scheduleDayOptions}
                    values={form.days}
                    onChange={(nextDays) => setForm((prev) => ({ ...prev, days: nextDays }))}
                    required
                  />

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-800">Subject Schedule List</div>
                    <div className="mt-4 space-y-4">
                    {loadingSubjects ? (
                      <div className="text-sm text-gray-500">Loading subjects...</div>
                    ) : subjectEntries.length ? (
                        subjectEntries.map((entry) => {
                          const hasOverlap = overlapSubjectIds.includes(entry.subjectId);

                          return (
                          <div
                            key={entry.subjectId}
                            className={clsx(
                              "rounded-xl border bg-gray-50 p-4 transition",
                              hasOverlap
                                ? "border-red-300 bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]"
                                : "border-gray-200",
                            )}
                          >
                            <div className="text-sm font-semibold text-gray-800">{entry.subjectCode}</div>
                            <div className="mt-1 text-sm text-gray-500">{entry.subjectName}</div>
                            {hasOverlap ? (
                              <div className="mt-3 text-xs font-medium text-red-600">
                                This schedule overlaps with another subject time.
                              </div>
                            ) : null}
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <Field
                                label="Start Time"
                                type="time"
                                value={entry.startTime}
                                onChange={(value) => handleEntryChange(entry.subjectId, "startTime", value)}
                                invalid={hasOverlap}
                                required
                              />
                              <Field
                                label="End Time"
                                type="time"
                                value={entry.endTime}
                                onChange={(value) => handleEntryChange(entry.subjectId, "endTime", value)}
                                invalid={hasOverlap}
                                required
                              />
                            </div>
                          </div>
                          );
                        })
                      ) : form.yearLevel && form.semester ? (
                        <div className="text-sm text-gray-500">No subject found.</div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Select a year level and semester to display the available subjects automatically.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? (editingSchedule ? "Updating..." : "Saving...") : editingSchedule ? "Update Schedule" : "Save Schedule"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetScheduleForm();
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </FormCard>
            </div>
        </div>
      ) : null}

      {deletingSchedule ? (
        <div className="modal-overlay">
          <div className="my-auto w-full max-w-2xl">
            <FormCard
              title="Delete Class Schedule"
              subtitle={`Are you sure you want to delete Section ${deletingSchedule.section} - ${deletingSchedule.yearLevel} (${deletingSchedule.semester})?`}
            >
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  className="btn btn-danger"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSchedule(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </FormCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminDepartmentPage() {
  const [departments, setDepartments] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState("10");
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [editId, setEditId] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const fetchDepartments = React.useCallback(async () => {
    try {
      const data = await apiFetch("/departments.php");
      if (Array.isArray(data)) setDepartments(data);
    } catch {
      // keep current state on failure
    }
  }, []);

  React.useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const filtered = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(keyword));
  }, [search, departments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * Number(pageSize), safePage * Number(pageSize));

  React.useEffect(() => { setPage(1); }, [search, pageSize]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setFeedback({ message: "Department name is required.", tone: "error" });
      return;
    }
    try {
      await apiFetch("/departments.php", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setAddModalOpen(false);
      setNewName("");
      setFeedback({ message: "Department successfully added.", tone: "success" });
      await fetchDepartments();
    } catch (err) {
      setFeedback({ message: err.message || "Failed to add department.", tone: "error" });
    }
  };

  const startEdit = (dept) => {
    setEditId(dept.id);
    setEditName(dept.name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const saveEdit = async (dept) => {
    const name = editName.trim();
    if (!name) {
      setFeedback({ message: "Department name is required.", tone: "error" });
      return;
    }
    if (name.toLowerCase() === dept.name.toLowerCase()) {
      setFeedback({ message: "No change made.", tone: "error" });
      cancelEdit();
      return;
    }
    try {
      await apiFetch("/departments.php", {
        method: "PUT",
        body: JSON.stringify({ id: dept.id, name }),
      });
      cancelEdit();
      setFeedback({ message: "Department successfully saved.", tone: "success" });
      await fetchDepartments();
    } catch (err) {
      setFeedback({ message: err.message || "Failed to update department.", tone: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/departments.php?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null);
      setFeedback({ message: "Department successfully deleted.", tone: "success" });
      await fetchDepartments();
    } catch (err) {
      setFeedback({ message: err.message || "Failed to delete department.", tone: "error" });
    }
  };

  return (
    <div className="animate-fade-up space-y-4">
      <HeaderBlock
        title="Department Management"
        description="Manage department names used across the system."
      />
      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <section className="card-elevated p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Field label="Search" hideLabel value={search} onChange={setSearch} placeholder="Search departments..." small />
          </div>
          <button type="button" onClick={() => { setAddModalOpen(true); setNewName(""); }} className="btn btn-secondary whitespace-nowrap">
            Add Department
          </button>
        </div>
      </section>

      <section className="card-elevated p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="text-sm text-gray-500">
            Showing <span className="text-gray-700">{paginated.length}</span> of <span className="text-gray-700">{filtered.length}</span> departments
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Rows per page</span>
            <div className="w-24">
              <SelectField label="Rows per page" hideLabel small value={pageSize} onChange={setPageSize} options={[{ label: "10", value: "10" }, { label: "30", value: "30" }, { label: "50", value: "50" }]} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-500">
                <th className="w-16 px-4 py-2 font-semibold">No.</th>
                <th className="px-4 py-2 font-semibold">Department Name</th>
                <th className="px-4 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((dept, idx) => (
                  <tr key={dept.id} className="group rounded-xl bg-gray-50/80 transition hover:bg-gray-100/80">
                    <td className="whitespace-nowrap rounded-l-xl px-4 py-3 text-sm text-gray-500">
                      {(safePage - 1) * Number(pageSize) + idx + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">
                      {editId === dept.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(dept);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        dept.name
                      )}
                    </td>
                    <td className="whitespace-nowrap rounded-r-xl px-4 py-3 text-right">
                      {editId === dept.id ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => saveEdit(dept)} className="btn btn-primary px-3 py-1 text-xs">Save</button>
                          <button type="button" onClick={cancelEdit} className="btn btn-secondary px-3 py-1 text-xs">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEdit(dept)} className="text-gray-400 transition hover:text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></svg>
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(dept)} className="text-gray-400 transition hover:text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    {search.trim() ? "No matching departments found." : "No departments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > Number(pageSize) ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              Page <span className="text-gray-700">{safePage}</span> of <span className="text-gray-700">{totalPages}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1} className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages} className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
          </div>
        ) : null}
      </section>

      {addModalOpen
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-md">
                <div className="card-elevated p-6">
                  <h2 className="text-lg font-semibold text-gray-800">Add Department</h2>
                  <p className="mt-1 text-sm text-gray-500">Enter the name of the new department.</p>
                  <div className="mt-4">
                    <Field label="Department Name" value={newName} onChange={setNewName} placeholder="e.g. CIST" />
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => { setAddModalOpen(false); setNewName(""); }} className="btn btn-secondary">Cancel</button>
                    <button type="button" onClick={handleAdd} className="btn btn-primary">Add</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-md">
                <div className="card-elevated p-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-7"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-gray-800">Confirm Deletion</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Are you sure to delete department name <span className="font-semibold text-gray-800">{deleteTarget.name}</span>?
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">No</button>
                    <button type="button" onClick={handleDelete} className="btn btn-primary bg-red-600 hover:bg-red-700">Yes</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function AdminArchivePage() {
  const { users, updateUser } = useAuth();
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("student");
  const [pageSize, setPageSize] = React.useState("10");
  const [page, setPage] = React.useState(1);
  const [pendingRestore, setPendingRestore] = React.useState(null);

  const archivedUsers = React.useMemo(
    () =>
      users.filter((user) => {
        if (user.status !== "Archived") return false;
        if (user.role !== roleFilter) return false;
        const haystack = `${user.idNumber ?? ""} ${user.firstName} ${user.middleName ?? ""} ${user.lastName} ${user.username ?? ""} ${user.email ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, users, roleFilter],
  );

  const totalPages = Math.max(1, Math.ceil(archivedUsers.length / Number(pageSize)));
  const paginatedUsers = React.useMemo(() => {
    const size = Number(pageSize);
    const startIndex = (page - 1) * size;
    return archivedUsers.slice(startIndex, startIndex + size);
  }, [page, pageSize, archivedUsers]);

  React.useEffect(() => { setPage(1); }, [search, pageSize, roleFilter]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const isStudent = roleFilter === "student";

  return (
    <div className="space-y-6">
      <HeaderBlock title="Archived" description="Archived accounts can be restored at any time." />

      {feedback.message ? (
        <FeedbackModal message={feedback.message} tone={feedback.tone} onClose={() => setFeedback({ message: "", tone: "success" })} />
      ) : null}

      <section className="card p-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search archived accounts..."
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 sm:max-w-xs"
            />
          </div>
          <div className="text-sm text-gray-500">{archivedUsers.length} archived account{archivedUsers.length === 1 ? "" : "s"}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-5 py-4 font-medium">No.</th>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">ID Number</th>
                {isStudent ? (
                  <>
                    <th className="px-5 py-4 font-medium">Year</th>
                    <th className="px-5 py-4 font-medium">Section</th>
                  </>
                ) : (
                  <th className="px-5 py-4 font-medium">Department</th>
                )}
                <th className="px-5 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={isStudent ? 7 : 6} className="px-5 py-10 text-center text-gray-400">No archived accounts found.</td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => {
                  const deptParts = (user.department ?? "").split(" - ");
                  const yearLevel = deptParts.length >= 2 ? deptParts[0] : "—";
                  const section = deptParts.length >= 2 ? deptParts[1] : "—";
                  return (
                    <tr key={user.id} className="border-b border-gray-50 transition hover:bg-gray-50/60">
                      <td className="px-5 py-3.5 text-gray-500">{(page - 1) * Number(pageSize) + index + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{[user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ")}</td>
                      <td className="px-5 py-3.5 text-gray-600">{user.idNumber ?? "—"}</td>
                      {isStudent ? (
                        <>
                          <td className="px-5 py-3.5 text-gray-600">{yearLevel}</td>
                          <td className="px-5 py-3.5 text-gray-600">{section}</td>
                        </>
                      ) : (
                        <td className="px-5 py-3.5 text-gray-600">{user.department ?? "—"}</td>
                      )}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingRestore(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
                        >
                          <RefreshCw size={13} />
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
            >
              {["5", "10", "25", "50"].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="btn btn-secondary px-3 py-2 text-xs disabled:opacity-40">Prev</button>
            <span className="px-3 text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="btn btn-secondary px-3 py-2 text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>

      {pendingRestore
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-md">
                <FormCard
                  title="Restore Student Account"
                  subtitle={`Are you sure you want to restore ${[pendingRestore.firstName, pendingRestore.lastName].filter(Boolean).join(" ")}? They will appear in the student list again.`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setPendingRestore(null)} className="btn btn-secondary">Cancel</button>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateUser(pendingRestore.id, { status: "Active" });
                        setFeedback({ message: `${[pendingRestore.firstName, pendingRestore.lastName].filter(Boolean).join(" ")} restored.`, tone: "success" });
                        setPendingRestore(null);
                      }}
                      className="btn btn-primary"
                    >
                      Confirm
                    </button>
                  </div>
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function AdminAccountPage() {
  const { currentUser, users, updateOwnAccount, addUser, updateUser, deleteUser } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [archiveRedirect, setArchiveRedirect] = React.useState(false);
  const [closeStudentModal, setCloseStudentModal] = React.useState(false);
  const [closeFacultyModal, setCloseFacultyModal] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedAccountView, setSelectedAccountView] = React.useState("my");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = React.useState(false);
  const [viewedFaculty, setViewedFaculty] = React.useState(null);
  const [facultyEditForm, setFacultyEditForm] = React.useState(null);
  const [openFacultyActionsMenu, setOpenFacultyActionsMenu] = React.useState(null);
  const [pendingFacultyAction, setPendingFacultyAction] = React.useState(null);
  const [facultyPageSize, setFacultyPageSize] = React.useState("10");
  const [facultyPage, setFacultyPage] = React.useState(1);
  const [viewedStudent, setViewedStudent] = React.useState(null);
  const [studentEditForm, setStudentEditForm] = React.useState(null);
  const [openStudentActionsMenu, setOpenStudentActionsMenu] = React.useState(null);
  const [pendingStudentAction, setPendingStudentAction] = React.useState(null);
  const [studentPageSize, setStudentPageSize] = React.useState("10");
  const [studentPage, setStudentPage] = React.useState(1);
  const [form, setForm] = React.useState({
    username: currentUser?.username ?? "",
    firstName: currentUser?.firstName ?? "",
    middleName: currentUser?.middleName ?? "",
    lastName: currentUser?.lastName ?? "",
    email: currentUser?.email ?? "",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [newUser, setNewUser] = React.useState({
    role: "student",
    idNumber: "",
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    department: "",
  });
  const [studentSection, setStudentSection] = React.useState("");
  const [studentYearLevel, setStudentYearLevel] = React.useState("");
  const [departments, setDepartments] = React.useState([]);

  React.useEffect(() => {
    apiFetch("/departments.php")
      .then((data) => { if (Array.isArray(data)) setDepartments(data); })
      .catch(() => {});
  }, []);

  const selectedAccount = React.useMemo(() => {
    if (selectedAccountView === "my") return currentUser ?? null;
    return null;
  }, [currentUser, selectedAccountView, users]);

  const filteredFaculty = React.useMemo(
    () =>
      users.filter((user) => {
        if (user.role !== "faculty") return false;
        if (user.status === "Archived") return false;
        const haystack = `${user.idNumber ?? ""} ${user.firstName} ${user.middleName ?? ""} ${user.lastName} ${user.username ?? ""} ${user.email ?? ""} ${user.status ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, users],
  );

  const totalFacultyPages = Math.max(1, Math.ceil(filteredFaculty.length / Number(facultyPageSize)));
  const paginatedFaculty = React.useMemo(() => {
    const size = Number(facultyPageSize);
    const startIndex = (facultyPage - 1) * size;
    return filteredFaculty.slice(startIndex, startIndex + size);
  }, [facultyPage, facultyPageSize, filteredFaculty]);

  const filteredStudents = React.useMemo(
    () =>
      users.filter((user) => {
        if (user.role !== "student") return false;
        if (user.status === "Archived") return false;
        const haystack = `${user.idNumber ?? ""} ${user.firstName} ${user.middleName ?? ""} ${user.lastName} ${user.username ?? ""} ${user.email ?? ""} ${user.status ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, users],
  );

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / Number(studentPageSize)));
  const paginatedStudents = React.useMemo(() => {
    const size = Number(studentPageSize);
    const startIndex = (studentPage - 1) * size;
    return filteredStudents.slice(startIndex, startIndex + size);
  }, [filteredStudents, studentPage, studentPageSize]);

  const isOwnAccountView = selectedAccountView === "my";

  React.useEffect(() => {
    if (!currentUser) return;
    setForm({
      username: currentUser.username ?? "",
      firstName: currentUser.firstName ?? "",
      middleName: currentUser.middleName ?? "",
      lastName: currentUser.lastName ?? "",
      email: currentUser.email ?? "",
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }, [currentUser]);

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-faculty-actions-menu]") && !event.target.closest("[data-faculty-actions-trigger]")) {
        setOpenFacultyActionsMenu(null);
      }
      if (!event.target.closest("[data-student-actions-menu]") && !event.target.closest("[data-student-actions-trigger]")) {
        setOpenStudentActionsMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    setFacultyPage(1);
  }, [search, facultyPageSize]);

  React.useEffect(() => {
    if (facultyPage > totalFacultyPages) {
      setFacultyPage(totalFacultyPages);
    }
  }, [facultyPage, totalFacultyPages]);

  React.useEffect(() => {
    setStudentPage(1);
  }, [search, studentPageSize]);

  React.useEffect(() => {
    if (studentPage > totalStudentPages) {
      setStudentPage(totalStudentPages);
    }
  }, [studentPage, totalStudentPages]);

  React.useEffect(() => {
    if (!viewedFaculty) {
      setFacultyEditForm(null);
      return;
    }

    setFacultyEditForm({
      id: viewedFaculty.id,
      role: viewedFaculty.role ?? "faculty",
      idNumber: viewedFaculty.idNumber ?? "",
      department: viewedFaculty.department ?? "",
      firstName: viewedFaculty.firstName ?? "",
      middleName: viewedFaculty.middleName ?? "",
      lastName: viewedFaculty.lastName ?? "",
      username: viewedFaculty.username ?? "",
      email: viewedFaculty.email ?? "",
      phone: viewedFaculty.phone ?? "",
      password: viewedFaculty.password ?? "",
      confirmPassword: viewedFaculty.password ?? "",
      status: viewedFaculty.status ?? "Active",
    });
  }, [viewedFaculty]);

  React.useEffect(() => {
    if (!viewedStudent) {
      setStudentEditForm(null);
      return;
    }

    const deptStr = viewedStudent.department ?? "";
    const deptParts = deptStr.split(" - ");
    const parsedYearLevel = deptParts.length >= 2 ? deptParts[0] : "";
    const parsedSection = deptParts.length >= 2 ? deptParts[1] : "";

    setStudentEditForm({
      id: viewedStudent.id,
      role: viewedStudent.role ?? "student",
      status: viewedStudent.status ?? "Active",
      idNumber: viewedStudent.idNumber ?? "",
      firstName: viewedStudent.firstName ?? "",
      middleName: viewedStudent.middleName ?? "",
      lastName: viewedStudent.lastName ?? "",
      username: viewedStudent.username ?? "",
      email: viewedStudent.email ?? "",
      phone: viewedStudent.phone ?? "",
      studentYearLevel: parsedYearLevel,
      studentSection: parsedSection,
    });
  }, [viewedStudent]);

  const saveOwnAccount = async (event) => {
    event.preventDefault();
    const error = validateAdminOwnAccount(form, users, currentUser);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    await updateOwnAccount({
      username: form.username,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      email: form.email,
    });
    setFeedback({ message: "Admin profile updated successfully.", tone: "success" });
  };

  const saveOwnPassword = async (event) => {
    event.preventDefault();
    const error = validateAdminPasswordChange(passwordForm);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    await updateOwnAccount({
      currentPassword: passwordForm.currentPassword,
      password: passwordForm.newPassword,
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setFeedback({ message: "Admin password updated successfully.", tone: "success" });
  };

  const submitNewUser = async (event) => {
    event.preventDefault();
    // Compose department value for students from year level + section
    const isStudent = newUser.role === "student";
    const department = isStudent
      ? `${studentYearLevel} - ${studentSection}`
      : newUser.department;
    const payload = { ...newUser, department };
    const error = validateNewUserAccount(payload, users);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    try {
      await addUser({
        role: newUser.role,
        status: "Active",
        idNumber: newUser.idNumber,
        department,
        firstName: newUser.firstName,
        middleName: newUser.middleName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password,
      });
      setNewUser({
        role: "student",
        idNumber: "",
        username: "",
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        department: "",
      });
      setStudentSection("");
      setStudentYearLevel("");
      setFeedback({ message: "New user account added.", tone: "success" });
      setIsAddUserModalOpen(false);
    } catch (submissionError) {
      setFeedback({ message: submissionError.message || "Failed to add user.", tone: "error" });
    }
  };

  return (
    <div className="animate-fade-up space-y-4">
      <HeaderBlock
        rightContent={(
          <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1.1fr)_200px] lg:grid-cols-[minmax(0,1.1fr)_250px_190px] md:items-center">
            <div className="w-full">
              <Field
                label="Search Accounts"
                hideLabel
                value={search}
                placeholder="Search by name, email, or role"
                onChange={setSearch}
                small
              />
            </div>
            <div className="w-full">
              <SelectField
                label="Display Account"
                value={selectedAccountView}
                onChange={setSelectedAccountView}
                options={[
                  { label: "My Account", value: "my" },
                  { label: "Faculty Account", value: "faculty" },
                  { label: "Student Account", value: "student" },
                ]}
                hideLabel
                small
              />
            </div>
            <button type="button" onClick={() => setIsAddUserModalOpen(true)} className="btn btn-secondary whitespace-nowrap">
              Add User Account
            </button>
          </div>
        )}
      />
      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, message: "" }));
          if (archiveRedirect) {
            setArchiveRedirect(false);
            navigate("/admin/archive");
          }
          if (closeStudentModal) {
            setCloseStudentModal(false);
            setViewedStudent(null);
          }
          if (closeFacultyModal) {
            setCloseFacultyModal(false);
            setViewedFaculty(null);
          }
        }}
      />

      <section className="grid gap-4">
        <FormCard
          title={selectedAccountView === "my" ? "My Account" : selectedAccountView === "faculty" ? "Faculty Account" : "Student Account"}
          subtitle={
            selectedAccountView === "faculty" || selectedAccountView === "student"
              ? ""
              : isOwnAccountView
              ? ""
              : selectedAccount
                ? `Showing live ${selectedAccount.role} account information from the current user records.`
                : `No ${selectedAccountView} account record is available yet.`
          }
        >
          {selectedAccountView === "faculty" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Showing <span className="text-gray-700">{paginatedFaculty.length}</span> of <span className="text-gray-700">{filteredFaculty.length}</span> faculty accounts
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Rows per page</span>
                  <div className="w-24">
                    <SelectField
                      label="Rows per page"
                      hideLabel
                      small
                      value={facultyPageSize}
                      onChange={setFacultyPageSize}
                      options={[
                        { label: "10", value: "10" },
                        { label: "20", value: "20" },
                        { label: "30", value: "30" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-500">
                    <th className="px-4 py-2">ID Number</th>
                    <th className="px-4 py-2">Full Name</th>
                    <th className="px-4 py-2">Username/Email</th>
                    <th className="px-4 py-2">Password</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFaculty.length ? (
                    paginatedFaculty.map((faculty) => (
                      <tr key={faculty.id} className="account-table-row text-sm text-gray-700">
                        <td className="rounded-l-[1.3rem] px-4 py-4 align-top">{faculty.idNumber ?? "N/A"}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="account-name-cell">
                            <span>{[faculty.firstName, faculty.middleName, faculty.lastName].filter(Boolean).join(" ")}</span>
                            <AccountStatusBadge status={faculty.status} />
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div>{faculty.username ?? "N/A"}</div>
                          <div className="mt-1 text-xs text-gray-500">{faculty.email ?? "N/A"}</div>
                        </td>
                        <td className="px-4 py-4 align-top">{faculty.password ?? "N/A"}</td>
                        <td className="rounded-r-[1.3rem] px-4 py-4 align-top">
                          <div className="inline-block">
                            <button
                              type="button"
                              data-faculty-actions-trigger
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setOpenFacultyActionsMenu((prev) =>
                                  prev?.id === faculty.id
                                    ? null
                                    : {
                                        id: faculty.id,
                                        top: rect.bottom + 10,
                                        left: rect.right - 208,
                                      },
                                );
                              }}
                              className="btn btn-secondary min-w-[9.5rem] justify-between text-xs uppercase tracking-wider"
                            >
                              <span className="inline-flex items-center gap-2">
                                <EllipsisVertical size={15} />
                                Actions
                              </span>
                              <ChevronDown
                                size={15}
                                className={clsx(
                                  "transition-transform duration-200",
                                  openFacultyActionsMenu?.id === faculty.id ? "rotate-180" : "",
                                )}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        No faculty accounts match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Page <span className="text-gray-700">{facultyPage}</span> of <span className="text-gray-700">{totalFacultyPages}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFacultyPage((prev) => Math.max(1, prev - 1))}
                    disabled={facultyPage === 1}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFacultyPage((prev) => Math.min(totalFacultyPages, prev + 1))}
                    disabled={facultyPage === totalFacultyPages}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : selectedAccountView === "student" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Showing <span className="text-gray-700">{paginatedStudents.length}</span> of <span className="text-gray-700">{filteredStudents.length}</span> student accounts
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Rows per page</span>
                  <div className="w-24">
                    <SelectField
                      label="Rows per page"
                      hideLabel
                      small
                      value={studentPageSize}
                      onChange={setStudentPageSize}
                      options={[
                        { label: "10", value: "10" },
                        { label: "20", value: "20" },
                        { label: "30", value: "30" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-500">
                    <th className="px-4 py-2">ID Number</th>
                    <th className="px-4 py-2">Full Name</th>
                    <th className="px-4 py-2">Username/Email</th>
                    <th className="px-4 py-2">Password</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length ? (
                    paginatedStudents.map((student) => (
                      <tr key={student.id} className="account-table-row text-sm text-gray-700">
                        <td className="rounded-l-[1.3rem] px-4 py-4 align-top">{student.idNumber ?? "N/A"}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="account-name-cell">
                            <span>{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")}</span>
                            <AccountStatusBadge status={student.status} />
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div>{student.username ?? "N/A"}</div>
                          <div className="mt-1 text-xs text-gray-500">{student.email ?? "N/A"}</div>
                        </td>
                        <td className="px-4 py-4 align-top">{student.password ?? "N/A"}</td>
                        <td className="rounded-r-[1.3rem] px-4 py-4 align-top">
                          <div className="inline-block">
                            <button
                              type="button"
                              data-student-actions-trigger
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setOpenStudentActionsMenu((prev) =>
                                  prev?.id === student.id
                                    ? null
                                    : {
                                        id: student.id,
                                        top: rect.bottom + 10,
                                        left: rect.right - 208,
                                      },
                                );
                              }}
                              className="btn btn-secondary min-w-[9.5rem] justify-between text-xs uppercase tracking-wider"
                            >
                              <span className="inline-flex items-center gap-2">
                                <EllipsisVertical size={15} />
                                Actions
                              </span>
                              <ChevronDown
                                size={15}
                                className={clsx(
                                  "transition-transform duration-200",
                                  openStudentActionsMenu?.id === student.id ? "rotate-180" : "",
                                )}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        No student accounts match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Page <span className="text-gray-700">{studentPage}</span> of <span className="text-gray-700">{totalStudentPages}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentPage((prev) => Math.max(1, prev - 1))}
                    disabled={studentPage === 1}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentPage((prev) => Math.min(totalStudentPages, prev + 1))}
                    disabled={studentPage === totalStudentPages}
                    className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : selectedAccount ? (
            isOwnAccountView ? (
              <div className="space-y-4">
                <form onSubmit={saveOwnAccount} className="grid gap-4 md:grid-cols-2">
                  <Field label="Username" placeholder="Enter username" value={form.username} onChange={(value) => setForm((prev) => ({ ...prev, username: value }))} />
                  <Field label="First Name" placeholder="Enter first name" value={form.firstName} onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))} />
                  <Field label="Middle Name" placeholder="Enter middle name" value={form.middleName} onChange={(value) => setForm((prev) => ({ ...prev, middleName: value }))} />
                  <Field label="Last Name" placeholder="Enter last name" value={form.lastName} onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))} />
                  <Field label="Email" type="email" placeholder="Enter email address" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
                  <button type="submit" className="btn btn-primary md:col-span-2 justify-self-start">
                    Save Profile
                  </button>
                </form>

                <div className="border-t border-gray-200 pt-4">
                  <FormCard
                    title="Change Password"
                    subtitle=""
                  >
                    <form onSubmit={saveOwnPassword} className="grid gap-4 md:grid-cols-2">
                      <Field label="Current Password" type="password" placeholder="Enter current password" allowVisibilityToggle value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))} />
                      <Field label="New Password" type="password" placeholder="Enter new password" allowVisibilityToggle value={passwordForm.newPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))} />
                      <div className="md:col-span-2">
                        <Field label="Confirm New Password" type="password" placeholder="Confirm new password" allowVisibilityToggle value={passwordForm.confirmNewPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: value }))} />
                      </div>
                      <button type="submit" className="btn btn-primary md:col-span-2 justify-self-start">
                        Change Password
                      </button>
                    </form>
                  </FormCard>
                </div>
              </div>
            ) : (
              <form className="grid gap-4 md:grid-cols-2">
                <Field label="Username" value={selectedAccount.username ?? ""} onChange={() => {}} disabled />
                <Field label="First Name" value={selectedAccount.firstName ?? ""} onChange={() => {}} disabled />
                <Field label="Middle Name" value={selectedAccount.middleName ?? ""} onChange={() => {}} disabled />
                <Field label="Last Name" value={selectedAccount.lastName ?? ""} onChange={() => {}} disabled />
                <Field label="Email" type="email" value={selectedAccount.email ?? ""} onChange={() => {}} disabled />
                <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
                  <StatChip label="Role" value={roleLabels[selectedAccount.role] ?? selectedAccount.role} />
                  <StatChip label="Status" value={selectedAccount.status ?? "Unknown"} />
                </div>
                <p className="md:col-span-2 text-sm text-gray-500">This view is read-only so you can quickly inspect accurate faculty or student account information.</p>
              </form>
            )
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              No account data is available for the selected view.
            </div>
          )}
        </FormCard>

      </section>

      {isAddUserModalOpen
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden px-1 sm:max-h-[calc(100dvh-3rem)] sm:px-0">
                <FormCard title="Add User Account">
                  <form onSubmit={submitNewUser} className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Role"
                      value={newUser.role}
                      onChange={(value) => setNewUser((prev) => ({ ...prev, role: value, department: "", studentSection: "", studentYearLevel: "" }))}
                      required
                      options={[
                        { label: "Faculty", value: "faculty" },
                        { label: "Student", value: "student" },
                      ]}
                    />
                    {newUser.role === "faculty" ? (
                      <SelectField
                        label="Department"
                        value={newUser.department}
                        onChange={(value) => setNewUser((prev) => ({ ...prev, department: value }))}
                        required
                        options={[{ label: "Select department...", value: "" }, ...departments.map((d) => ({ label: d.name, value: d.name }))]}
                      />
                    ) : newUser.role === "student" ? (
                      <>
                        <SelectField
                          label="Year Level"
                          value={studentYearLevel}
                          onChange={setStudentYearLevel}
                          required
                          options={[
                            { label: "Select year level...", value: "" },
                            { label: "1st Year", value: "1st Year" },
                            { label: "2nd Year", value: "2nd Year" },
                            { label: "3rd Year", value: "3rd Year" },
                            { label: "4th Year", value: "4th Year" },
                          ]}
                        />
                        <SelectField
                          label="Section"
                          value={studentSection}
                          onChange={setStudentSection}
                          required
                          options={[{ label: "Select section...", value: "" }, ...["A", "B", "C", "D", "E"].map((s) => ({ label: s, value: s }))]}
                        />
                      </>
                    ) : null}
                    <Field required label="ID Number" placeholder="Enter ID number" value={newUser.idNumber} onChange={(value) => setNewUser((prev) => ({ ...prev, idNumber: value }))} />
                    <Field required label="First Name" placeholder="Enter first name" value={newUser.firstName} onChange={(value) => setNewUser((prev) => ({ ...prev, firstName: value }))} />
                    <Field label="Middle Name" placeholder="Enter middle name (optional)" value={newUser.middleName} onChange={(value) => setNewUser((prev) => ({ ...prev, middleName: value }))} />
                    <Field required label="Last Name" placeholder="Enter last name" value={newUser.lastName} onChange={(value) => setNewUser((prev) => ({ ...prev, lastName: value }))} />
                    <Field required label="Username" placeholder="Enter username" value={newUser.username} onChange={(value) => setNewUser((prev) => ({ ...prev, username: value }))} />
                    <Field required label="Email" type="email" placeholder="Enter email address" value={newUser.email} onChange={(value) => setNewUser((prev) => ({ ...prev, email: value }))} />
                    <Field required label="Phone" placeholder="09xxxxxxxxx" value={newUser.phone} onChange={(value) => setNewUser((prev) => ({ ...prev, phone: value }))} />
                    <Field required label="Password" type="password" placeholder="Enter password" allowVisibilityToggle value={newUser.password} onChange={(value) => setNewUser((prev) => ({ ...prev, password: value }))} />
                    <Field required label="Confirm Password" type="password" placeholder="Confirm password" allowVisibilityToggle value={newUser.confirmPassword} onChange={(value) => setNewUser((prev) => ({ ...prev, confirmPassword: value }))} />
                    <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => { setIsAddUserModalOpen(false); setStudentSection(""); setStudentYearLevel(""); }} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-secondary">
                        Add Account
                      </button>
                    </div>
                  </form>
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}

      {openFacultyActionsMenu
        ? createPortal(
            <div
              data-faculty-actions-menu
              className="fixed z-[115] w-52 origin-top-right rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-fade-up"
              style={{
                top: `${Math.max(16, openFacultyActionsMenu.top)}px`,
                left: `${Math.min(Math.max(16, openFacultyActionsMenu.left), window.innerWidth - 224)}px`,
              }}
            >
              {(() => {
                const activeFaculty = users.find((user) => user.id === openFacultyActionsMenu.id);
                if (!activeFaculty) return null;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setViewedFaculty(activeFaculty);
                        setOpenFacultyActionsMenu(null);
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      View/Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setPendingFacultyAction({
                          type: activeFaculty.status === "Active" ? "deactivate" : "activate",
                          facultyId: activeFaculty.id,
                        });
                        setOpenFacultyActionsMenu(null);
                      }}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      {activeFaculty.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFacultyAction({
                          type: "archive",
                          facultyId: activeFaculty.id,
                        });
                        setOpenFacultyActionsMenu(null);
                      }}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-orange-600 transition hover:bg-orange-50"
                    >
                      Archive
                    </button>
                  </>
                );
              })()}
            </div>,
            document.body,
          )
        : null}

      {openStudentActionsMenu
        ? createPortal(
            <div
              data-student-actions-menu
              className="fixed z-[115] w-52 origin-top-right rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-fade-up"
              style={{
                top: `${Math.max(16, openStudentActionsMenu.top)}px`,
                left: `${Math.min(Math.max(16, openStudentActionsMenu.left), window.innerWidth - 224)}px`,
              }}
            >
              {(() => {
                const activeStudent = users.find((user) => user.id === openStudentActionsMenu.id);
                if (!activeStudent) return null;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setViewedStudent(activeStudent);
                        setOpenStudentActionsMenu(null);
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      View/Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setPendingStudentAction({
                          type: activeStudent.status === "Active" ? "deactivate" : "activate",
                          studentId: activeStudent.id,
                        });
                        setOpenStudentActionsMenu(null);
                      }}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      {activeStudent.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingStudentAction({
                          type: "archive",
                          studentId: activeStudent.id,
                        });
                        setOpenStudentActionsMenu(null);
                      }}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-orange-600 transition hover:bg-orange-50"
                    >
                      Archive
                    </button>
                  </>
                );
              })()}
            </div>,
            document.body,
          )
        : null}

      {pendingFacultyAction
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-md">
                <FormCard
                  title={pendingFacultyAction.type === "archive" ? "Archive Faculty Account" : `${pendingFacultyAction.type === "deactivate" ? "Deactivate" : "Activate"} Faculty Account`}
                  subtitle={(() => {
                    const targetFaculty = users.find((user) => user.id === pendingFacultyAction.facultyId);
                    const fullName = targetFaculty ? [targetFaculty.firstName, targetFaculty.lastName].filter(Boolean).join(" ") : "this faculty member";
                    if (pendingFacultyAction.type === "archive") return `Are you sure you want to archive ${fullName}? They will be hidden from the faculty list.`;
                    if (pendingFacultyAction.type === "deactivate") return `Are you sure you want to deactivate ${fullName}?`;
                    return `Are you sure you want to activate ${fullName}?`;
                  })()}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setPendingFacultyAction(null)}
                      className="btn btn-secondary"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetFaculty = users.find((user) => user.id === pendingFacultyAction.facultyId);
                        if (!targetFaculty) {
                          setPendingFacultyAction(null);
                          return;
                        }

                        if (pendingFacultyAction.type === "archive") {
                          await updateUser(targetFaculty.id, { status: "Archived" });
                          setFeedback({ message: `${[targetFaculty.firstName, targetFaculty.lastName].filter(Boolean).join(" ")} has been archived successfully.`, tone: "success" });
                          setPendingFacultyAction(null);
                          setArchiveRedirect(true);
                        } else {
                          const updatedFaculty = await updateUser(targetFaculty.id, {
                            status: pendingFacultyAction.type === "deactivate" ? "Inactive" : "Active",
                          });
                          if (viewedFaculty?.id === updatedFaculty.id) {
                            setViewedFaculty(updatedFaculty);
                          }
                          setFeedback({ message: `${[targetFaculty.firstName, targetFaculty.lastName].filter(Boolean).join(" ")} status updated.`, tone: "success" });
                          setPendingFacultyAction(null);
                        }
                      }}
                      className={clsx(
                        "rounded-2xl px-5 py-3.5 text-sm font-semibold",
                        pendingFacultyAction.type === "archive"
                          ? "btn btn-primary"
                          : "btn btn-secondary",
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}

      {pendingStudentAction
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-md">
                <FormCard
                  title={pendingStudentAction.type === "archive" ? "Archive Student Account" : `${pendingStudentAction.type === "deactivate" ? "Deactivate" : "Activate"} Student Account`}
                  subtitle={(() => {
                    const targetStudent = users.find((user) => user.id === pendingStudentAction.studentId);
                    const fullName = targetStudent ? [targetStudent.firstName, targetStudent.lastName].filter(Boolean).join(" ") : "this student";
                    if (pendingStudentAction.type === "archive") return `Are you sure you want to archive ${fullName}? They will be hidden from the student list.`;
                    if (pendingStudentAction.type === "deactivate") return `Are you sure you want to deactivate ${fullName}?`;
                    return `Are you sure you want to activate ${fullName}?`;
                  })()}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setPendingStudentAction(null)}
                      className="btn btn-secondary"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetStudent = users.find((user) => user.id === pendingStudentAction.studentId);
                        if (!targetStudent) {
                          setPendingStudentAction(null);
                          return;
                        }

                        if (pendingStudentAction.type === "archive") {
                          await updateUser(targetStudent.id, { status: "Archived" });
                          setFeedback({ message: `${[targetStudent.firstName, targetStudent.lastName].filter(Boolean).join(" ")} has been archived successfully.`, tone: "success" });
                          setPendingStudentAction(null);
                          setArchiveRedirect(true);
                        } else {
                          await updateUser(targetStudent.id, {
                            status: pendingStudentAction.type === "deactivate" ? "Inactive" : "Active",
                          });
                          setFeedback({ message: `${[targetStudent.firstName, targetStudent.lastName].filter(Boolean).join(" ")} status updated.`, tone: "success" });
                          setPendingStudentAction(null);
                        }
                      }}
                      className={clsx(
                        "rounded-2xl px-5 py-3.5 text-sm font-semibold",
                        pendingStudentAction.type === "archive"
                          ? "btn btn-primary"
                          : "btn btn-secondary",
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}

      {viewedFaculty
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden px-1 sm:max-h-[calc(100dvh-3rem)] sm:px-0">
                <FormCard title="Faculty Account Details">
                  {facultyEditForm ? (
                    <form
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const error = validateNewUserAccount(facultyEditForm, users, facultyEditForm.id);
                        if (error) {
                          setFeedback({ message: error, tone: "error" });
                          return;
                        }

                        try {
                          const updatedFaculty = await updateUser(facultyEditForm.id, {
                            role: "faculty",
                            idNumber: facultyEditForm.idNumber,
                            department: facultyEditForm.department,
                            firstName: facultyEditForm.firstName,
                            middleName: facultyEditForm.middleName,
                            lastName: facultyEditForm.lastName,
                            username: facultyEditForm.username,
                            email: facultyEditForm.email,
                            phone: facultyEditForm.phone,
                          });
                          setViewedFaculty(updatedFaculty);
                          setFeedback({ message: "Faculty account updated successfully.", tone: "success" });
                          setCloseFacultyModal(true);
                        } catch (submissionError) {
                          setFeedback({ message: submissionError.message || "Failed to update the faculty account.", tone: "error" });
                        }
                      }}
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <Field required label="ID Number" placeholder="Enter ID number" value={facultyEditForm.idNumber} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, idNumber: value }))} />
                      <Field required label="Username" placeholder="Enter username" value={facultyEditForm.username} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, username: value }))} />
                      <Field required label="First Name" placeholder="Enter first name" value={facultyEditForm.firstName} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, firstName: value }))} />
                      <Field label="Middle Name" placeholder="Enter middle name (optional)" value={facultyEditForm.middleName} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, middleName: value }))} />
                      <Field required label="Last Name" placeholder="Enter last name" value={facultyEditForm.lastName} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, lastName: value }))} />
                      <Field required label="Email" type="email" placeholder="Enter email address" value={facultyEditForm.email} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, email: value }))} />
                      <Field required label="Phone" placeholder="09xxxxxxxxx" value={facultyEditForm.phone} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, phone: value }))} />
                      <Field required label="Department" placeholder="Enter department" value={facultyEditForm.department} onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, department: value }))} />
                      <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setViewedFaculty(null)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : null}
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}

      {viewedStudent
        ? createPortal(
            <div className="modal-overlay">
              <div className="my-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden px-1 sm:max-h-[calc(100dvh-3rem)] sm:px-0">
                <FormCard title="Student Account Details">
                  {studentEditForm ? (
                    <form
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const composedDepartment = `${studentEditForm.studentYearLevel} - ${studentEditForm.studentSection}`;
                        const formWithDept = { ...studentEditForm, department: composedDepartment };
                        const error = validateNewUserAccount(formWithDept, users, studentEditForm.id);
                        if (error) {
                          setFeedback({ message: error, tone: "error" });
                          return;
                        }

                        try {
                          const updatedStudent = await updateUser(studentEditForm.id, {
                            role: "student",
                            status: studentEditForm.status,
                            idNumber: studentEditForm.idNumber,
                            department: composedDepartment,
                            firstName: studentEditForm.firstName,
                            middleName: studentEditForm.middleName,
                            lastName: studentEditForm.lastName,
                            username: studentEditForm.username,
                            email: studentEditForm.email,
                            phone: studentEditForm.phone,
                          });
                          setViewedStudent(updatedStudent);
                          setFeedback({ message: "Student account updated successfully.", tone: "success" });
                          setCloseStudentModal(true);
                        } catch (submissionError) {
                          setFeedback({ message: submissionError.message || "Failed to update the student account.", tone: "error" });
                        }
                      }}
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <SelectField
                        label="Role"
                        value={studentEditForm.role}
                        onChange={() => {}}
                        disabled
                        options={[{ label: "Student", value: "student" }]}
                      />
                      <SelectField
                        label="Year Level"
                        value={studentEditForm.studentYearLevel}
                        onChange={(value) => setStudentEditForm((prev) => ({ ...prev, studentYearLevel: value }))}
                        required
                        options={[
                          { label: "Select year level...", value: "" },
                          { label: "1st Year", value: "1st Year" },
                          { label: "2nd Year", value: "2nd Year" },
                          { label: "3rd Year", value: "3rd Year" },
                          { label: "4th Year", value: "4th Year" },
                        ]}
                      />
                      <SelectField
                        label="Section"
                        value={studentEditForm.studentSection}
                        onChange={(value) => setStudentEditForm((prev) => ({ ...prev, studentSection: value }))}
                        required
                        options={[{ label: "Select section...", value: "" }, ...["A", "B", "C", "D", "E"].map((s) => ({ label: s, value: s }))]}
                      />
                      <Field required label="ID Number" placeholder="Enter ID number" value={studentEditForm.idNumber} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, idNumber: value }))} />
                      <Field required label="First Name" placeholder="Enter first name" value={studentEditForm.firstName} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, firstName: value }))} />
                      <Field label="Middle Name" placeholder="Enter middle name (optional)" value={studentEditForm.middleName} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, middleName: value }))} />
                      <Field required label="Last Name" placeholder="Enter last name" value={studentEditForm.lastName} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, lastName: value }))} />
                      <Field required label="Username" placeholder="Enter username" value={studentEditForm.username} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, username: value }))} />
                      <Field required label="Email" type="email" placeholder="Enter email address" value={studentEditForm.email} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, email: value }))} />
                      <Field required label="Phone" placeholder="09xxxxxxxxx" value={studentEditForm.phone} onChange={(value) => setStudentEditForm((prev) => ({ ...prev, phone: value }))} />
                      <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setViewedStudent(null)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : null}
                </FormCard>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ─── Developer Mode: Test Attendance ─── */
function DeveloperAttendancePage() {
  const [students, setStudents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [submitting, setSubmitting] = React.useState(null);
  const [todayDate, setTodayDate] = React.useState("");
  const [search, setSearch] = React.useState("");

  const fetchStudents = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/test-attendance.php");
      setStudents(Array.isArray(result.students) ? result.students : []);
      setTodayDate(result.date || "");
    } catch (err) {
      setError(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAttendance = React.useCallback(async (userId, type) => {
    setSubmitting(`${userId}-${type}`);
    try {
      const result = await apiFetch("/test-attendance.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
      });
      setFeedback({ message: `${result.name} — ${type} recorded at ${result.time}`, tone: "success" });
      // Refresh the list to update status
      fetchStudents();
    } catch (err) {
      setFeedback({ message: err.message || "Failed to record attendance.", tone: "error" });
    } finally {
      setSubmitting(null);
    }
  }, [fetchStudents]);

  const filteredStudents = React.useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => {
      const full = `${s.idNumber ?? ""} ${s.firstName} ${s.middleName ?? ""} ${s.lastName} ${s.department ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [students, search]);

  function formatTime(time) {
    if (!time) return "—";
    const [h, m] = time.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  return (
    <div className="animate-fade-up space-y-6">
      <HeaderBlock
        title="Developer Mode — Test Attendance"
        description="Simulate fingerprint/card attendance for testing. Click IN or OUT to record attendance for any active student."
      />

      {feedback.message ? (
        <FeedbackModal message={feedback.message} tone={feedback.tone} onClose={() => setFeedback({ message: "", tone: "success" })} />
      ) : null}

      {error ? (
        <div className="alert alert-error">
          <p className="font-semibold">Error</p>
          <p className="mt-1 text-xs opacity-80">{error}</p>
          <button onClick={fetchStudents} className="btn btn-secondary mt-3 text-xs">Retry</button>
        </div>
      ) : null}

      <section className="card-elevated p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Active Students</h2>
            <p className="mt-1 text-sm text-gray-500">
              Today: <strong className="text-gray-700">{todayDate}</strong> &middot; {students.length} student{students.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 sm:max-w-xs"
            />
            <button onClick={fetchStudents} disabled={loading} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50" title="Refresh">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Loading students...</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">ID Number</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Last Status</th>
                  <th className="px-4 py-3 font-medium">Last Time</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length ? filteredStudents.map((s, i) => {
                  const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
                  const isSubmittingIN = submitting === `${s.id}-IN`;
                  const isSubmittingOUT = submitting === `${s.id}-OUT`;
                  return (
                    <tr key={s.id} className="border-b border-gray-50 transition hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{s.idNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.department ?? "—"}</td>
                      <td className="px-4 py-3">
                        {s.lastLogStatus ? (
                          <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", s.lastLogStatus === "IN" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                            {s.lastLogStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No record</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatTime(s.lastLogTime)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAttendance(s.id, "IN")}
                            disabled={submitting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSubmittingIN ? <RefreshCw size={12} className="animate-spin" /> : null}
                            IN
                          </button>
                          <button
                            onClick={() => handleAttendance(s.id, "OUT")}
                            disabled={submitting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                          >
                            {isSubmittingOUT ? <RefreshCw size={12} className="animate-spin" /> : null}
                            OUT
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{search ? "No students match your search." : "No active students found."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SelfAccountPage({ role }) {
  const { currentUser, users, updateOwnAccount } = useAuth();
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const usesManagedSelfAccount = role === "faculty" || role === "student";
  const [form, setForm] = React.useState({
    ...(usesManagedSelfAccount
      ? {
          idNumber: currentUser?.idNumber ?? "",
          username: currentUser?.username ?? "",
        }
      : {}),
    firstName: currentUser?.firstName ?? "",
    middleName: currentUser?.middleName ?? "",
    lastName: currentUser?.lastName ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? "",
    ...(usesManagedSelfAccount
      ? {}
      : {
          smartCardId: currentUser?.smartCardId ?? "",
          fingerprintId: currentUser?.fingerprintId ?? "",
        }),
    department: currentUser?.department ?? "",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = usesManagedSelfAccount ? validateFacultyOwnAccount(form, users, currentUser) : validateAccount(form);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    await updateOwnAccount(form);
    setFeedback({ message: `${roleLabels[role]} account updated successfully.`, tone: "success" });
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const error = validateAdminPasswordChange(passwordForm);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    await updateOwnAccount({
      currentPassword: passwordForm.currentPassword,
      password: passwordForm.newPassword,
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setFeedback({ message: `${roleLabels[role]} password updated successfully.`, tone: "success" });
  };

  return (
    <div className="animate-fade-up space-y-4">
      <HeaderBlock
        title={usesManagedSelfAccount ? undefined : `${roleLabels[role]} Account`}
        description={usesManagedSelfAccount ? undefined : "Review and update your own profile details inside the new dark professional interface."}
      />
      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <FormCard title="Profile Details" subtitle={usesManagedSelfAccount ? undefined : "This form keeps your current validation rules and uses the new project styling."}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {usesManagedSelfAccount ? (
            <Field label="ID Number" value={form.idNumber} onChange={(value) => setForm((prev) => ({ ...prev, idNumber: value }))} disabled />
          ) : null}
          <Field label="First Name" placeholder="Enter first name" value={form.firstName} onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))} />
          <Field label="Middle Name" placeholder="Enter middle name (optional)" value={form.middleName} onChange={(value) => setForm((prev) => ({ ...prev, middleName: value }))} />
          <Field label="Last Name" placeholder="Enter last name" value={form.lastName} onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))} />
          {usesManagedSelfAccount ? (
            <Field label="Username" placeholder="Enter username" value={form.username} onChange={(value) => setForm((prev) => ({ ...prev, username: value }))} />
          ) : null}
          <Field label="Email" type="email" placeholder="Enter email address" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <Field label="Phone" placeholder="09xxxxxxxxx" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
          {!usesManagedSelfAccount ? (
            <Field label="Smart Card ID" placeholder="Enter smart card ID" value={form.smartCardId} onChange={(value) => setForm((prev) => ({ ...prev, smartCardId: value }))} />
          ) : null}
          {!usesManagedSelfAccount ? (
            <Field label="Fingerprint ID" placeholder="Enter fingerprint ID" value={form.fingerprintId} onChange={(value) => setForm((prev) => ({ ...prev, fingerprintId: value }))} />
          ) : null}
          <div className="md:col-span-2">
            <Field label="Department / Section" placeholder="Enter department or section" value={form.department} onChange={(value) => setForm((prev) => ({ ...prev, department: value }))} />
          </div>
          <button type="submit" className="btn btn-primary md:col-span-2 justify-self-start">
            Update Account
          </button>
        </form>
      </FormCard>

      {usesManagedSelfAccount ? (
        <FormCard title="Change Password">
          <form onSubmit={handlePasswordSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="Current Password" type="password" placeholder="Enter current password" allowVisibilityToggle value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))} />
            <Field label="New Password" type="password" placeholder="Enter new password" allowVisibilityToggle value={passwordForm.newPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))} />
            <div className="md:col-span-2">
              <Field label="Confirm New Password" type="password" placeholder="Confirm new password" allowVisibilityToggle value={passwordForm.confirmNewPassword} onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: value }))} />
            </div>
            <button type="submit" className="btn btn-primary md:col-span-2 justify-self-start">
              Change Password
            </button>
          </form>
        </FormCard>
      ) : null}
    </div>
  );
}

function EditableUserCard({ user, onSave, onToggleStatus, onDelete }) {
  const [draft, setDraft] = React.useState(user);

  React.useEffect(() => setDraft(user), [user]);

  return (
    <article className="card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center size-9 rounded-lg bg-gray-100 text-green-700">
            <Users size={18} />
          </span>
          <div>
            <div className="font-semibold text-gray-800">
              {[user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ")}
            </div>
            <div className="text-xs text-gray-500">
              {roleLabels[user.role]} | {user.status}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onToggleStatus} className="btn btn-secondary text-xs">
            {user.status === "Active" ? "Deactivate" : "Activate"}
          </button>
          <button type="button" onClick={onDelete} className="btn btn-danger text-xs">
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field small label="First Name" placeholder="Enter first name" value={draft.firstName} onChange={(value) => setDraft((prev) => ({ ...prev, firstName: value }))} />
        <Field small label="Middle Name" placeholder="Enter middle name (optional)" value={draft.middleName ?? ""} onChange={(value) => setDraft((prev) => ({ ...prev, middleName: value }))} />
        <Field small label="Last Name" placeholder="Enter last name" value={draft.lastName} onChange={(value) => setDraft((prev) => ({ ...prev, lastName: value }))} />
        <Field small label="Email" placeholder="Enter email address" value={draft.email} onChange={(value) => setDraft((prev) => ({ ...prev, email: value }))} />
        <Field small label="Phone" placeholder="09xxxxxxxxx" value={draft.phone} onChange={(value) => setDraft((prev) => ({ ...prev, phone: value }))} />
        <Field small label="Smart Card ID" placeholder="Enter smart card ID" value={draft.smartCardId} onChange={(value) => setDraft((prev) => ({ ...prev, smartCardId: value }))} />
        <Field small label="Fingerprint ID" placeholder="Enter fingerprint ID" value={draft.fingerprintId} onChange={(value) => setDraft((prev) => ({ ...prev, fingerprintId: value }))} />
        <Field small label="Department" placeholder="Enter department or section" value={draft.department} onChange={(value) => setDraft((prev) => ({ ...prev, department: value }))} />
        <SelectField
          small
          label="Role"
          value={draft.role}
          onChange={(value) => setDraft((prev) => ({ ...prev, role: value }))}
          options={[
            { label: "Faculty", value: "faculty" },
            { label: "Student", value: "student" },
          ]}
        />
      </div>

      <button type="button" onClick={() => onSave(draft)} className="btn btn-primary mt-4">
        Update User
      </button>
    </article>
  );
}

function parseTimeToMinutes(value) {
  const normalizedValue = normalizeTimeInputValue(value);
  if (!normalizedValue || !/^\d{2}:\d{2}$/.test(normalizedValue)) return null;
  const [hours, minutes] = normalizedValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function normalizeTimeInputValue(value) {
  if (!value) return "";
  const normalizedValue = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(normalizedValue)) {
    return normalizedValue.slice(0, 5);
  }
  return /^\d{2}:\d{2}$/.test(normalizedValue) ? normalizedValue : normalizedValue.slice(0, 5);
}

function formatTimeRange(startTime, endTime) {
  const formatValue = (value) => {
    if (!value || !/^\d{2}:\d{2}/.test(value)) return value || "N/A";
    const [hoursText, minutesText] = value.slice(0, 5).split(":");
    const hours = Number(hoursText);
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${minutesText} ${suffix}`;
  };

  return `${formatValue(startTime)} - ${formatValue(endTime)}`;
}

function formatScheduleDays(days) {
  if (!Array.isArray(days) || !days.length) return "No days selected";
  const dayCodes = {
    Monday: "M",
    Tuesday: "T",
    Wednesday: "W",
    Thursday: "TH",
    Friday: "F",
    Saturday: "S",
  };

  return days
    .map((day) => dayCodes[day] ?? day)
    .join("-");
}

function HeroClockCard({ time, date, timezone }) {
  return (
    <div className="card-elevated p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Live Manila Time</p>
          <p className="mt-2 text-sm text-gray-500">{timezone}</p>
        </div>
        <div className="online-dot">
          Online
        </div>
      </div>
      <div className="mt-8 text-4xl font-semibold text-gray-800 sm:text-5xl">{time}</div>
      <div className="mt-3 text-base text-gray-500">{date}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatChip label="Mode" value="Dual Verification" />
        <StatChip label="Status" value="Monitoring Active" />
      </div>
    </div>
  );
}

function HeroClockSkeleton() {
  return (
    <div className="card-elevated p-5 sm:p-6">
      <div className="skeleton h-5 w-32" />
      <div className="skeleton mt-6 h-16 w-full" />
      <div className="skeleton mt-4 h-6 w-2/3" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-22" />
        <div className="skeleton h-22" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="hero-card p-6">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-5 h-10 w-2/3" />
        <div className="skeleton mt-3 h-18 w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card-elevated p-5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton mt-4 h-10 w-24" />
            <div className="skeleton mt-4 h-4 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card-elevated h-80 skeleton" />
        <div className="card-elevated h-80 skeleton" />
      </div>
    </div>
  );
}

function BrandLockup({ caption }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div>
        <div className="font-display text-lg font-bold leading-none text-white tracking-tight">FRANCIS KEY</div>
        {caption ? <div className="mt-1 text-[0.65rem] uppercase tracking-wider text-white/50">{caption}</div> : null}
      </div>
    </div>
  );
}

function BrandMark({ compact = false }) {
  return (
    <span
      className={clsx(
        "relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-lg",
        compact ? "size-10 rounded-lg" : "size-11",
      )}
    >
      <img
        src="/sfcg-logo.jpeg"
        alt="Saint Francis College logo"
        className={clsx("relative z-10 rounded-lg object-cover", compact ? "h-7 w-7" : "h-8 w-8")}
      />
    </span>
  );
}

function HeaderBlock({ title, description, rightContent = null }) {
  return (
    <section className="hero-card p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {title ? <h1 className="text-2xl font-semibold text-white sm:text-[1.75rem]">{title}</h1> : null}
          {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">{description}</p> : null}
        </div>
        {rightContent ? <div className="w-full lg:w-auto">{rightContent}</div> : null}
      </div>
    </section>
  );
}

function FormCard({ title, subtitle, children }) {
  return (
    <section className="card-elevated p-5">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-gray-500">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hideLabel = false, small = false, icon: Icon, variant = "default", disabled = false, required = false, allowVisibilityToggle = false, invalid = false }) {
  const isSignin = variant === "signin";
  const [showValue, setShowValue] = React.useState(false);
  const isPasswordField = type === "password";
  const resolvedType = isPasswordField && allowVisibilityToggle ? (showValue ? "text" : "password") : type;

  return (
    <label className="block">
      {!hideLabel ? (
        <span className={clsx("mb-2 flex items-center gap-2 font-medium text-gray-700", small ? "text-xs" : "text-sm")}>
          <span>{label}</span>
          {required ? <Asterisk size={12} className="text-green-600" /> : null}
        </span>
      ) : null}
      <span className="relative block">
        {Icon ? (
          <span className={clsx("pointer-events-none absolute top-1/2 -translate-y-1/2", isSignin ? "left-3 text-gray-400" : "left-4 text-gray-400")}>
            <Icon size={isSignin ? 18 : 17} />
          </span>
        ) : null}
        <input
          type={resolvedType}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            "w-full outline-none transition",
            isSignin
              ? "signin-input rounded-none py-3.5 pr-3 pl-11 text-base"
              : small
                ? "form-input rounded-lg px-3 py-2.5 text-sm"
                : "form-input rounded-lg px-4 py-3 text-sm",
            Icon && !isSignin ? "pl-12" : "",
            allowVisibilityToggle ? "pr-12" : "",
            invalid ? "error" : "",
            disabled ? "cursor-not-allowed opacity-60 bg-gray-100" : "",
          )}
        />
        {allowVisibilityToggle ? (
          <button
            type="button"
            onClick={() => setShowValue((prev) => !prev)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
          >
            {showValue ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, small = false, icon: Icon, variant = "default", hideLabel = false, required = false, disabled = false }) {
  const isSignin = variant === "signin";

  return (
    <label className="block">
      {!hideLabel ? (
        <span className={clsx("mb-2 flex items-center gap-2 font-medium text-gray-700", small ? "text-xs" : "text-sm")}>
          <span>{label}</span>
          {required ? <Asterisk size={12} className="text-green-600" /> : null}
        </span>
      ) : null}
      <span className="relative block">
        {Icon ? (
          <span className={clsx("pointer-events-none absolute top-1/2 -translate-y-1/2", isSignin ? "left-3 text-gray-400" : "left-4 text-gray-400")}>
            <Icon size={isSignin ? 18 : 17} />
          </span>
        ) : null}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          disabled={disabled}
          className={clsx(
            "w-full appearance-none outline-none transition",
            isSignin
              ? "signin-input rounded-none py-3.5 pr-10 pl-11 text-base"
              : small
                ? "form-input rounded-lg px-3 py-2.5 text-sm"
                : "form-input rounded-lg px-4 py-3 text-sm",
            Icon && !isSignin ? "pl-12 pr-10" : "",
            !Icon && !isSignin ? "pr-10" : "",
            disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={clsx("pointer-events-none absolute top-1/2 -translate-y-1/2", isSignin ? "right-3 text-gray-400" : "right-4 text-gray-400")}>
          <ChevronDown size={16} />
        </span>
      </span>
    </label>
  );
}

function CheckboxGroup({ label, options, values, onChange, required = false }) {
  const selectedValues = Array.isArray(values) ? values : [];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>{label}</span>
        {required ? <Asterisk size={12} className="text-green-600" /> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selectedValues.includes(option);

          return (
            <label
              key={option}
              className={clsx(
                "checkbox-group-item",
                checked && "checked",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? selectedValues.filter((value) => value !== option) : [...selectedValues, option],
                  )
                }
                className="h-4 w-4 rounded border-gray-300 bg-transparent accent-green-600"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="stat-chip">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-gray-800">{value}</div>
    </div>
  );
}

function AccountStatusBadge({ status = "Inactive" }) {
  const isActive = String(status).toLowerCase() === "active";

  return (
    <span className={clsx("status-badge", isActive ? "status-active" : "status-inactive")}>
      <span className="status-dot" aria-hidden />
      <span>{isActive ? "Active" : "Inactive"}</span>
    </span>
  );
}

function InfoPill({ label, value, variant = "default" }) {
  if (variant === "sidebar") {
    return (
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
        {label}: <span className="text-white/90">{value}</span>
      </div>
    );
  }
  return (
    <div className="info-pill">
      {label}: <span className="font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function FeedbackModal({ message, tone = "success", onClose }) {
  if (!message) return null;

  const isError = tone === "error";

  return createPortal(
    <div className="modal-overlay">
      <div className="my-auto card-elevated w-full max-w-md p-6 text-center">
        <div
          className={clsx(
            "mx-auto flex size-14 items-center justify-center rounded-full border",
            isError
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-green-200 bg-green-50 text-green-600",
          )}
        >
          {isError ? <LockKeyhole size={22} /> : <BadgeCheck size={24} />}
        </div>
        <h2 className="mt-5 text-xl font-semibold text-gray-800">{isError ? "Error" : "Success"}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">{message}</p>
        <button type="button" onClick={onClose} className="btn btn-primary mt-6 w-full px-5 py-3">
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}

function validateAccount(payload) {
  if (!payload.firstName?.trim() || !payload.lastName?.trim()) return "First name and last name are required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email ?? "")) return "A valid email address is required.";
  if (!/^\d{11}$/.test(payload.phone ?? "")) return "Phone number must be 11 digits.";
  if (Object.prototype.hasOwnProperty.call(payload, "smartCardId") || Object.prototype.hasOwnProperty.call(payload, "fingerprintId")) {
    if (!payload.smartCardId?.trim() || !payload.fingerprintId?.trim()) return "Smart Card ID and Fingerprint ID are required.";
  }
  if (!payload.department?.trim()) return "Department or section is required.";
  return "";
}

function validateAdminOwnAccount(payload, users = [], currentUser = null) {
  const normalizedUsername = payload.username?.trim().toLowerCase();
  const normalizedEmail = payload.email?.trim().toLowerCase();
  const comparableUsers = users.filter((user) => user.id !== currentUser?.id);

  if (!payload.firstName?.trim() || !payload.lastName?.trim()) return "First name and last name are required.";
  if (!payload.username?.trim()) return "Username is required.";
  if (payload.username.trim().length < 6) return "Username must be at least 6 characters long.";
  if (comparableUsers.some((user) => String(user.username ?? "").trim().toLowerCase() === normalizedUsername)) return "Username already exists.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email ?? "")) return "A valid email address is required.";
  if (comparableUsers.some((user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail)) return "Email address already exists.";
  return "";
}

function validateFacultyOwnAccount(payload, users = [], currentUser = null) {
  const normalizedIdNumber = payload.idNumber?.trim().toLowerCase();
  const normalizedUsername = payload.username?.trim().toLowerCase();
  const normalizedEmail = payload.email?.trim().toLowerCase();
  const normalizedPhone = payload.phone?.trim();
  const comparableUsers = users.filter((user) => user.id !== currentUser?.id);

  if (!payload.idNumber?.trim()) return "ID number is required.";
  if (payload.idNumber.trim().length < 6) return "ID number must be at least 6 characters long.";
  if (comparableUsers.some((user) => String(user.idNumber ?? "").trim().toLowerCase() === normalizedIdNumber)) return "ID number already exists.";
  if (!payload.firstName?.trim() || !payload.lastName?.trim()) return "First name and last name are required.";
  if (!payload.username?.trim()) return "Username is required.";
  if (payload.username.trim().length < 6) return "Username must be at least 6 characters long.";
  if (comparableUsers.some((user) => String(user.username ?? "").trim().toLowerCase() === normalizedUsername)) return "Username already exists.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email ?? "")) return "A valid email address is required.";
  if (comparableUsers.some((user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail)) return "Email address already exists.";
  if (!/^09\d{9}$/.test(payload.phone ?? "")) return "Phone number must start with 09 and be exactly 11 digits long.";
  if (!payload.department?.trim()) return "Department or section is required.";
  return "";
}

function validateAdminPasswordChange(payload) {
  if (!(payload.currentPassword ?? "").trim()) return "Current password is required.";
  if ((payload.newPassword ?? "").trim().length < 6) return "Password must be at least 6 characters long.";
  if (payload.currentPassword === payload.newPassword) return "The current password and new password must not be the same.";
  if (payload.newPassword !== payload.confirmNewPassword) return "The new password and confirm new password do not match.";
  return "";
}

function validateNewUserAccount(payload, users = [], excludedUserId = null) {
  const hasNumber = /\d/;
  const normalizedIdNumber = payload.idNumber?.trim().toLowerCase();
  const normalizedUsername = payload.username?.trim().toLowerCase();
  const normalizedEmail = payload.email?.trim().toLowerCase();
  const normalizedPhone = payload.phone?.trim();
  const comparableUsers = users.filter((user) => user.id !== excludedUserId);

  if (!payload.role?.trim()) return "Role is required.";
  if (!payload.idNumber?.trim()) return "ID number is required.";
  if (payload.idNumber.trim().length < 6) return "ID number must be at least 6 characters long.";
  if (comparableUsers.some((user) => String(user.idNumber ?? "").trim().toLowerCase() === normalizedIdNumber)) return "ID number already exists.";
  if (!payload.department?.trim()) return "Department / Section is required.";
  if (!payload.firstName?.trim()) return "First name is required.";
  if (hasNumber.test(payload.firstName)) return "First name must not contain numbers.";
  if (payload.middleName?.trim() && hasNumber.test(payload.middleName)) return "Middle name must not contain numbers.";
  if (!payload.lastName?.trim()) return "Last name is required.";
  if (hasNumber.test(payload.lastName)) return "Last name must not contain numbers.";
  if (!payload.username?.trim()) return "Username is required.";
  if (payload.username.trim().length < 6) return "Username must be at least 6 characters long.";
  if (comparableUsers.some((user) => String(user.username ?? "").trim().toLowerCase() === normalizedUsername)) return "Username already exists.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email ?? "")) return "A valid email address is required.";
  if (comparableUsers.some((user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail)) return "Email address already exists.";
  if (!/^09\d{9}$/.test(payload.phone ?? "")) return "Phone number must start with 09 and be exactly 11 digits long.";
  if (payload.password !== undefined || payload.confirmPassword !== undefined) {
    if (!payload.password?.trim()) return "Password is required.";
    if (payload.password.trim().length < 6) return "Password must be at least 6 characters long.";
    if (!payload.confirmPassword?.trim()) return "Confirm password is required.";
    if (payload.confirmPassword.trim().length < 6) return "Confirm password must be at least 6 characters long.";
    if (payload.password !== payload.confirmPassword) return "Password and confirm password must match.";
  }
  return "";
}
