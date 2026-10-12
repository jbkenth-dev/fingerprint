import React from "react";
import { createPortal } from "react-dom";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Activity, Archive, Asterisk, BadgeCheck, BookOpenText, Building2, CalendarDays, CalendarRange, ChevronDown, CircleCheck, CircleX, Clock, CreditCard, EllipsisVertical, Eye, EyeOff, FileBarChart, Fingerprint, Info, LayoutDashboard, LockKeyhole, LogIn, LogOut, Menu, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert, UserCog, UserRound, Users, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { panelContent, roleLabels, roles, routeConfig, sampleAttendance } from "./data/mockData";
import { useMockLoading } from "./hooks/useMockLoading";
import { useManilaClock } from "./hooks/useManilaClock";
import { useAuth } from "./state/AuthContext";
import { apiFetch } from "./api";
import { manilaNow, datesInRange, fetchAttendanceRange, classifyAttendance, liveAttendance, searchAttendance, attendanceTime, attendanceWindow } from "./utils/attendance";
import { startPolling } from "./utils/polling";
import AdminReports from "./pages/AdminReports";
import FacultySchedule from "./pages/FacultySchedule";
import FacultyManual from "./pages/FacultyManual";

const navIcons = {
  "Dashboard & Monitoring": LayoutDashboard,
  "Class Subject": BookOpenText,
  "Class Scheduling": CalendarRange,
  "My Schedule": CalendarDays,
  "Smart Card": CreditCard,
  "Fingerprint Biometric": Fingerprint,
  Attendance: Activity,
  Manual: Pencil,
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
const emptyAdminForm = {
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
const attendanceStatusConfig = {
  present: {
    label: "Present",
    Icon: CircleCheck,
    pill: "border-green-200 bg-green-100 text-green-700",
    iconCls: "text-green-600",
  },
  late: {
    label: "Late",
    Icon: TriangleAlert,
    pill: "border-amber-200 bg-amber-100 text-amber-700",
    iconCls: "text-amber-500",
  },
  absent: {
    label: "Absent",
    Icon: CircleX,
    pill: "border-red-200 bg-red-100 text-red-700",
    iconCls: "text-red-500",
  },
};
export default function App() {
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/admin-create-account" element={<AdminCreateAccountPage />} />
        <Route path="/admin" element={<ProtectedLayout allowedRole="admin" />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="class-subject" element={<ClassSubjectPage />} />
          <Route path="class-scheduling" element={<ClassSchedulingPage />} />
          <Route path="smart-card" element={<RolePanel pageKey="smartCard" role="admin" />} />
          <Route path="fingerprint-biometric" element={<RolePanel pageKey="biometric" role="admin" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="admin" />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="department" element={<AdminDepartmentPage />} />
          <Route path="account" element={<AdminAccountPage />} />
          <Route path="archive" element={<AdminArchivePage />} />
          <Route path="developer-mode/attendance" element={<DeveloperAttendancePage />} />
        </Route>
        <Route path="/faculty" element={<ProtectedLayout allowedRole="faculty" />}>
          <Route index element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboardPage />} />
          <Route path="schedule" element={<FacultySchedule />} />
          <Route path="smart-card" element={<RolePanel pageKey="smartCard" role="faculty" />} />
          <Route path="fingerprint-biometric" element={<RolePanel pageKey="biometric" role="faculty" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="faculty" />} />
          <Route path="manual" element={<FacultyManual />} />
          <Route path="reports" element={<RolePanel pageKey="reports" role="faculty" />} />
          <Route path="account" element={<SelfAccountPage role="faculty" />} />
        </Route>
        <Route path="/student" element={<ProtectedLayout allowedRole="student" />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="account" element={<SelfAccountPage role="student" />} />
        </Route>
        <Route path="/how-to-use" element={<HowToUsePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function HowToUsePage() {
  return (
    <iframe
      src="/how-to-use.html"
      title="How to Use — Francis Key Device"
      style={{ width: "100%", height: "100vh", border: "none" }}
    />
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
  const [form, setForm] = React.useState({ identifier: "", password: "" });
  const [feedback, setFeedback] = React.useState({ message: "", tone: "error" });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (session?.role) navigate(`/${session.role}/dashboard`, { replace: true });
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
      navigate(`/${user.role}/dashboard`, { replace: true });
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

function AdminCreateAccountPage() {
  const { users } = useAuth();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = React.useState(false);
  const [setupPassword, setSetupPassword] = React.useState("");
  const [setupError, setSetupError] = React.useState("");
  const [form, setForm] = React.useState(emptyAdminForm);
  const [feedback, setFeedback] = React.useState({ message: "", tone: "success" });
  const [saving, setSaving] = React.useState(false);

  const setupEnvPassword = import.meta.env.VITE_ADMIN_SETUP_PASSWORD ?? "";
  const setupEnvConfigured = setupEnvPassword !== "";

  const handleUnlock = (event) => {
    event.preventDefault();
    if (!setupEnvConfigured) {
      setSetupError(
        "The admin setup password is not configured. Add VITE_ADMIN_SETUP_PASSWORD to your .env / Vercel environment and restart the dev server.",
      );
      return;
    }
    if (setupPassword === setupEnvPassword) {
      setUnlocked(true);
      setSetupError("");
    } else {
      setSetupError("Incorrect setup password. Please try again.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ message: "", tone: "success" });

    const payload = {
      role: "admin",
      status: "Active",
      idNumber: form.idNumber,
      username: form.username,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      confirmPassword: form.confirmPassword,
      department: form.department,
    };

    const validationError = validateNewUserAccount(payload, users);
    if (validationError) {
      setFeedback({ message: validationError, tone: "error" });
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/create-admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupPassword, ...payload }),
      });
      navigate("/admin/account");
    } catch (error) {
      setFeedback({ message: error.message || "Failed to create admin account.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(emptyAdminForm);
    setSetupPassword("");
  };

  return (
    <main className="app-shell min-h-dvh">
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-6 sm:px-6">
        <section className="animate-fade-up w-full max-w-3xl">
          {unlocked ? (
            <div className="space-y-4">
              <HeaderBlock
                title="Create Admin Account"
                description="Create a new administrator account. It will be active immediately and can sign in at the Sign In page with the Administrator role."
                rightContent={(
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setUnlocked(false);
                    }}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    Lock Page
                  </button>
                )}
              />
              <FormCard title="Admin Account Details">
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="ID Number"
                    value={form.idNumber}
                    onChange={(value) => setForm((prev) => ({ ...prev, idNumber: value }))}
                    placeholder="e.g. ADM-0002"
                    required
                  />
                  <Field
                    label="Username"
                    value={form.username}
                    onChange={(value) => setForm((prev) => ({ ...prev, username: value }))}
                    placeholder="At least 6 characters"
                    required
                  />
                  <Field
                    label="First Name"
                    value={form.firstName}
                    onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
                    placeholder="Enter first name"
                    required
                  />
                  <Field
                    label="Middle Name"
                    value={form.middleName}
                    onChange={(value) => setForm((prev) => ({ ...prev, middleName: value }))}
                    placeholder="Optional"
                  />
                  <Field
                    label="Last Name"
                    value={form.lastName}
                    onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
                    placeholder="Enter last name"
                    required
                  />
                  <Field
                    label="Email"
                    value={form.email}
                    onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                    placeholder="name@franciskey.local"
                    type="email"
                    required
                  />
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    placeholder="09xxxxxxxxx"
                    required
                  />
                  <Field
                    label="Department"
                    value={form.department}
                    onChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
                    placeholder="e.g. System Administration"
                    required
                  />
                  <Field
                    label="Password"
                    value={form.password}
                    onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
                    placeholder="At least 6 characters"
                    type="password"
                    allowVisibilityToggle
                    required
                  />
                  <Field
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
                    placeholder="Re-enter password"
                    type="password"
                    allowVisibilityToggle
                    required
                  />
                  <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? "Creating..." : "Create Admin Account"}
                    </button>
                    <button type="button" onClick={() => navigate("/")} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </FormCard>
            </div>
          ) : (
            <section className="signin-card px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
              <div className="flex justify-center">
                <img
                  src="/sfcg-logo.jpeg"
                  alt="Saint Francis College logo"
                  className="signin-logo h-18 w-18 rounded-full object-cover sm:h-20 sm:w-20"
                />
              </div>

              <h1 className="mt-6 text-center text-2xl font-semibold text-gray-800 sm:text-[1.75rem]">Admin Account Setup</h1>
              <p className="mt-2 text-center text-sm text-gray-500">Enter the setup password to create an administrator account.</p>

              <form onSubmit={handleUnlock} className="mt-8 space-y-5">
                <Field
                  label="Setup Password"
                  value={setupPassword}
                  onChange={setSetupPassword}
                  placeholder="Enter setup password"
                  type="password"
                  allowVisibilityToggle
                  icon={LockKeyhole}
                  variant="signin"
                />
                {setupError ? <div className="alert alert-error text-sm">{setupError}</div> : null}
                <button type="submit" className="signin-submit">
                  Unlock
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm font-medium text-green-600 transition hover:text-green-700"
                >
                  ← Back to home
                </button>
              </div>
            </section>
          )}
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
              if (item.disabled) {
                return (
                  <div
                    key={item.path}
                    className="sidebar-nav-item opacity-40 cursor-not-allowed pointer-events-none"
                  >
                    <span className="sidebar-nav-icon">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Reports" ? (
                      <span className="text-[0.6rem] rounded-full bg-white/10 px-1.5 py-0.5 text-white/50 whitespace-nowrap">
                        Coming Soon
                      </span>
                    ) : (
                      <span className="text-[0.6rem] rounded-full bg-white/10 px-1.5 py-0.5 text-white/50 whitespace-nowrap">
                        Soon
                      </span>
                    )}
                  </div>
                );
              }
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
                if (item.disabled) {
                  return (
                    <div
                      key={item.path}
                      className="sidebar-nav-item opacity-40 cursor-not-allowed pointer-events-none"
                    >
                      <span className="sidebar-nav-icon">
                        <Icon size={16} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.label === "Reports" ? (
                        <span className="text-[0.6rem] rounded-full bg-white/10 px-1.5 py-0.5 text-white/50 whitespace-nowrap">
                          Coming Soon
                         </span>
                      ) : (
                        <span className="text-[0.6rem] rounded-full bg-white/10 px-1.5 py-0.5 text-white/50 whitespace-nowrap">
                          Soon
                         </span>
                      )}
                    </div>
                  );
                }
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

/* ─── Dashboard Core (shared by admin & faculty) ─── */
function AdminDashboardPage() {
  return <DashboardCore scope="admin" />;
}

function FacultyDashboardPage() {
  return <DashboardCore scope="faculty" />;
}

function DashboardCore({ scope }) {
  const { users, currentUser } = useAuth();
  const [todayLogs, setTodayLogs] = React.useState([]);
  const [weekLogs, setWeekLogs] = React.useState({});
  const [scheduleRows, setScheduleRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const dayNameMap = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };

  function getManilaDate(daysAgo = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  }

  function getManilaDayName() {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    return dayNameMap[now.getDay()] || "";
  }

  function formatTime(logTime) {
    if (!logTime || !/^\d{2}:\d{2}/.test(logTime)) return "—";
    const [h, m] = logTime.slice(0, 5).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  function parseStudentDept(dept) {
    if (!dept) return null;
    const yearMap = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
    // Try "1st Year - C" format (digit, anything, dash, letter at end)
    const fullMatch = dept.match(/(\d)[^-]*-\s*([A-E])$/i);
    if (fullMatch) {
      return { yearLevel: yearMap[parseInt(fullMatch[1], 10)] || null, section: fullMatch[2].toUpperCase() };
    }
    // Try "BSIT 3A" format (digit immediately before letter at end)
    const shortMatch = dept.match(/(\d)\s*([A-E])$/i);
    if (shortMatch) {
      return { yearLevel: yearMap[parseInt(shortMatch[1], 10)] || null, section: shortMatch[2].toUpperCase() };
    }
    return null;
  }

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const today = getManilaDate(0);
        const [logsRes, schedulesRes] = await Promise.allSettled([
          fetchAttendanceRange(apiFetch, getManilaDate(6), today),
          apiFetch("/class-schedules.php"),
        ]);
        if (cancelled) return;
        if (logsRes.status === "rejected") throw logsRes.reason;
        if (schedulesRes.status === "rejected") throw schedulesRes.reason;
        setTodayLogs(logsRes.value.filter(record => record.logDate === today));
        if (schedulesRes.status === "fulfilled" && Array.isArray(schedulesRes.value)) setScheduleRows(schedulesRes.value);
        const newWeek = {};
        for (let i = 0; i < 7; i++) {
          const date = getManilaDate(6 - i);
          newWeek[date] = logsRes.value.filter(record => record.logDate === date);
        }
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

  /* ── Derived metrics (students only) ── */
  const activeStudents = React.useMemo(() => users.filter((u) => u.role === "student" && u.status === "Active"), [users]);
  const totalUsers = React.useMemo(() => users.length, [users]);
  const totalFaculty = React.useMemo(() => users.filter((u) => u.role === "faculty").length, [users]);
  const totalStudents = React.useMemo(() => users.filter((u) => u.role === "student").length, [users]);
  const smartCardUsers = React.useMemo(() => users.filter((u) => u.smartCardId && u.status !== "Archived"), [users]);
  const fingerprintUsers = React.useMemo(() => users.filter((u) => u.fingerprintId && u.status !== "Archived"), [users]);

  const todayStudentLogs = React.useMemo(
    () =>
      todayLogs
        .filter((r) => activeStudents.some((s) => s.id === r.userId))
        .sort((a, b) => {
          const timeA = a.logTime ? timeToMinutes(a.logTime) : -1;
          const timeB = b.logTime ? timeToMinutes(b.logTime) : -1;
          return timeA - timeB;
        }),
    [todayLogs, activeStudents],
  );

  const userFirstIn = React.useMemo(() => {
    const map = new Map();
    for (const r of todayStudentLogs) {
      if (r.status === "IN" && !map.has(r.userId)) map.set(r.userId, r);
    }
    return map;
  }, [todayStudentLogs]);

  const userTimeOutAfterIn = React.useMemo(() => {
    const inTimeMap = new Map();
    // First, get the IN time for each student
    for (const r of todayStudentLogs) {
      if (r.status === "IN" && !inTimeMap.has(r.userId)) {
        inTimeMap.set(r.userId, timeToMinutes(r.logTime));
      }
    }

    const outMap = new Map();
    // Then, find the first OUT after IN for each student
    for (const r of todayStudentLogs) {
      if (r.status === "OUT") {
        const inTime = inTimeMap.get(r.userId);
        if (inTime != null) {
          const outTime = timeToMinutes(r.logTime);
          // Check if OUT is after IN and we haven't already recorded an OUT for this student
          if (outTime > inTime && !outMap.has(r.userId)) {
            outMap.set(r.userId, r);
          }
        }
      }
    }

    return outMap;
  }, [todayStudentLogs]);

  /* ── Attendance by Subject (all other metrics derive from this) ── */
  const todayDayName = React.useMemo(() => getManilaDayName(), []);

  const subjectStats = React.useMemo(() => {
    const todaySchedules = scheduleRows.filter((row) => {
      const days = Array.isArray(row.days) ? row.days : [];
      if (!days.includes(todayDayName)) return false;
      // Faculty scope: only the classes this faculty member teaches.
      if (scope === "faculty") {
        return currentUser ? Number(row.facultyId) === Number(currentUser.id) : false;
      }
      return true;
    });

    const studentInByUser = new Map();
    for (const [userId, record] of userFirstIn) {
      studentInByUser.set(userId, timeToMinutes(record.logTime));
    }

    return todaySchedules.map((schedule) => {
      const scheduleStudents = activeStudents.filter((s) => {
        const parsed = parseStudentDept(s.department);
        if (!parsed) return false;
        return parsed.yearLevel === schedule.yearLevel && parsed.section === schedule.section;
      });

      const startMin = timeToMinutes(schedule.startTime);
      const endMin = timeToMinutes(schedule.endTime);
      const graceStart = startMin != null ? startMin - 15 : null;
      const graceEnd = startMin != null ? startMin + 15 : null;
      const lateEnd = endMin != null ? endMin - 15 : null;

      let present = 0;
      let late = 0;
      const presentIds = new Set();
      const lateIds = new Set();
      const presentList = [];
      const lateList = [];

      for (const student of scheduleStudents) {
        const inMin = studentInByUser.get(student.id);
        if (inMin != null && graceStart != null && graceEnd != null && lateEnd != null) {
          const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
          const dept = student.department ?? "—";
          const subjectInfo = { subjectCode: schedule.subjectCode, subjectName: schedule.subjectName, startTime: schedule.startTime, endTime: schedule.endTime, section: schedule.section };
          if (inMin >= graceStart && inMin <= graceEnd) {
            present++;
            presentIds.add(student.id);
            const inRecord = userFirstIn.get(student.id);
            const outRecord = userTimeOutAfterIn.get(student.id);
            presentList.push({
              name: fullName,
              department: dept,
              timeIn: inRecord?.logTime,
              timeOut: outRecord?.logTime,
              ...subjectInfo
            });
          } else if (inMin > graceEnd && inMin <= lateEnd) {
            late++;
            lateIds.add(student.id);
            const inRecord = userFirstIn.get(student.id);
            const outRecord = userTimeOutAfterIn.get(student.id);
            lateList.push({
              name: fullName,
              department: dept,
              timeIn: inRecord?.logTime,
              timeOut: outRecord?.logTime,
              ...subjectInfo
            });
          }
        }
      }

      const absentList = scheduleStudents
        .filter((s) => !presentIds.has(s.id) && !lateIds.has(s.id))
        .map((s) => ({ name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "), department: s.department ?? "—", subjectCode: schedule.subjectCode, subjectName: schedule.subjectName, startTime: schedule.startTime, endTime: schedule.endTime, section: schedule.section }));
      const absent = absentList.length;

      return {
        id: schedule.id,
        subjectCode: schedule.subjectCode,
        subjectName: schedule.subjectName,
        section: schedule.section,
        yearLevel: schedule.yearLevel,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        facultyName: schedule.facultyName || "—",
        total: scheduleStudents.length,
        present,
        late,
        absent,
        presentList,
        lateList,
        absentList,
      };
    });
  }, [scheduleRows, todayDayName, activeStudents, userFirstIn, users, scope, currentUser]);

  const hasScheduleToday = subjectStats.length > 0;

  const presentUsers = React.useMemo(() => {
    const result = [];
    const seen = new Set();
    for (const sub of subjectStats) {
      for (const entry of sub.presentList) {
        if (!seen.has(entry.name)) {
          seen.add(entry.name);
          result.push(entry);
        }
      }
    }
    return result.sort((a, b) => ((a.timeIn || "") || "").localeCompare((b.timeIn || "") || ""));
  }, [subjectStats]);

  const lateUsers = React.useMemo(() => {
    const result = [];
    const seen = new Set();
    for (const sub of subjectStats) {
      for (const entry of sub.lateList) {
        if (!seen.has(entry.name)) {
          seen.add(entry.name);
          result.push(entry);
        }
      }
    }
    return result.sort((a, b) => ((a.timeIn || "") || "").localeCompare((b.timeIn || "") || ""));
  }, [subjectStats]);

  const absentUsers = React.useMemo(() => {
    const enrolledIds = new Set();
    const enrolledNames = new Map();
    for (const sub of subjectStats) {
      for (const entry of [...sub.presentList, ...sub.lateList, ...sub.absentList]) {
        if (!enrolledIds.has(entry.name)) {
          enrolledIds.add(entry.name);
          enrolledNames.set(entry.name, entry);
        }
      }
    }
    const result = [];
    const seen = new Set();
    for (const sub of subjectStats) {
      for (const entry of sub.absentList) {
        if (!seen.has(entry.name)) {
          seen.add(entry.name);
          result.push(entry);
        }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [subjectStats]);

  const totalIn = React.useMemo(() => {
    const count = new Set();
    for (const sub of subjectStats) {
      for (const entry of [...sub.presentList, ...sub.lateList]) count.add(entry.name);
    }
    return count.size;
  }, [subjectStats]);

  const totalOut = React.useMemo(() => {
    const enrolledNames = new Set();
    for (const sub of subjectStats) {
      for (const entry of [...sub.presentList, ...sub.lateList, ...sub.absentList]) enrolledNames.add(entry.name);
    }
    const count = new Set();
    for (const r of todayStudentLogs) {
      if (r.status === "OUT") {
        const user = users.find((u) => u.id === r.userId);
        const name = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ");
        if (enrolledNames.has(name)) count.add(name);
      }
    }
    return count.size;
  }, [subjectStats, todayStudentLogs, users]);

  // Faculty scope: sections this faculty member teaches, used to filter the weekly chart.
  const facultySections = React.useMemo(() => {
    if (scope !== "faculty") return null;
    const sections = new Set();
    for (const row of scheduleRows) {
      if (currentUser && Number(row.facultyId) === Number(currentUser.id)) {
        sections.add(`${row.yearLevel}|${row.section}`);
      }
    }
    return sections;
  }, [scope, scheduleRows, currentUser]);

  const dailyChart = React.useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = getManilaDate(6 - i);
      const logs = weekLogs[dateStr] || [];
      let uniquePresent;
      if (facultySections) {
        const ids = new Set();
        for (const r of logs) {
          if (r.status !== "IN") continue;
          const user = users.find((u) => u.id === r.userId);
          if (!user) continue;
          const parsed = parseStudentDept(user.department);
          if (!parsed) continue;
          if (facultySections.has(`${parsed.yearLevel}|${parsed.section}`)) ids.add(user.id);
        }
        uniquePresent = ids.size;
      } else {
        uniquePresent = new Set(logs.filter((r) => r.status === "IN").map((r) => r.userId)).size;
      }
      const d = new Date(dateStr + "T12:00:00");
      return { day: dayNames[d.getDay()], date: dateStr, present: uniquePresent };
    });
  }, [weekLogs, facultySections, users]);

  /* ── Export ── */
  const handleExport = React.useCallback(() => {
    const csvRows = [];
    const now = new Date();
    const dateStr = getManilaDate(0);
    const ts = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    csvRows.push(["Francis Key Dashboard Export"]);
    csvRows.push(["Generated", ts]);
    csvRows.push([]);
    csvRows.push(["=== SYSTEM SUMMARY ==="]);
    csvRows.push(["Metric", "Value"]);
    csvRows.push(["Total Users", totalUsers]);
    csvRows.push(["Faculty", totalFaculty]);
    csvRows.push(["Students", totalStudents]);
    csvRows.push([]);
    csvRows.push(["=== ATTENDANCE STATISTICS ==="]);
    csvRows.push(["Present", presentUsers.length]);
    csvRows.push(["Late", lateUsers.length]);
    csvRows.push(["Absent", absentUsers.length]);
    csvRows.push(["Total IN", totalIn]);
    csvRows.push(["Total OUT", totalOut]);
    csvRows.push([]);
    csvRows.push(["=== DETAILED STUDENT ATTENDANCE ==="]);
    csvRows.push(["Subject", "Section", "Student Name", "Time IN", "Time OUT", "Status"]);

    // Export detailed student attendance for each subject
    subjectStats.forEach((subject) => {
      // Present students
      subject.presentList.forEach((student) => {
        csvRows.push([
          `${subject.subjectCode} - ${subject.subjectName}`,
          `${subject.yearLevel} (${subject.section})`,
          student.name,
          student.timeIn ? formatTime(student.timeIn) : "",
          student.timeOut ? formatTime(student.timeOut) : "",
          "Present"
        ]);
      });

      // Late students
      subject.lateList.forEach((student) => {
        csvRows.push([
          `${subject.subjectCode} - ${subject.subjectName}`,
          `${subject.yearLevel} (${subject.section})`,
          student.name,
          student.timeIn ? formatTime(student.timeIn) : "",
          student.timeOut ? formatTime(student.timeOut) : "",
          "Late"
        ]);
      });

      // Absent students
      subject.absentList.forEach((student) => {
        csvRows.push([
          `${subject.subjectCode} - ${subject.subjectName}`,
          `${subject.yearLevel} (${subject.section})`,
          student.name,
          "", // No time IN for absent
          "", // No time OUT for absent
          "Absent"
        ]);
      });
    });

    csvRows.push([]);
    csvRows.push(["=== PRESENT USERS ==="]);
    csvRows.push(["Name", "Department", "Time In", "Time Out"]);
    presentUsers.forEach((u) => csvRows.push([u.name, u.department, formatTime(u.timeIn), formatTime(u.timeOut)]));
    csvRows.push([]);
    csvRows.push(["=== LATE USERS ==="]);
    csvRows.push(["Name", "Department", "Time In", "Time Out"]);
    lateUsers.forEach((u) => csvRows.push([u.name, u.department, formatTime(u.timeIn), formatTime(u.timeOut)]));
    csvRows.push([]);
    csvRows.push(["=== ABSENT USERS ==="]);
    csvRows.push(["Name", "Department"]);
    absentUsers.forEach((u) => csvRows.push([u.name, u.department]));
    const csv = csvRows.map((row) => row.map((c) => { const s = String(c ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `francis-key-dashboard-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [totalUsers, totalFaculty, totalStudents, presentUsers, lateUsers, absentUsers, totalIn, totalOut, subjectStats]);

  const [expandedSubject, setExpandedSubject] = React.useState(null);

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

      {!hasScheduleToday ? (
        <div className="card-elevated p-8 text-center">
          <div className="text-lg font-semibold text-gray-700">No classes scheduled for today ({todayDayName})</div>
          <p className="mt-2 text-sm text-gray-500">There are no class schedules on this day. Attendance data will appear when classes are scheduled.</p>
        </div>
      ) : null}

      {/* Section 1: System Dashboard */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Users", value: totalUsers },
          { label: "Faculty Members", value: totalFaculty },
          { label: "Students", value: totalStudents },
          { label: "Today's Attendance", value: totalIn },
        ].map((m) => (
          <article key={m.label} className="card-elevated p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{m.label}</div>
            <div className="mt-3 text-2xl font-bold text-gray-800">{m.value}</div>
          </article>
        ))}
      </section>

      {hasScheduleToday ? (
      <>
      {/* Sections 2 & 3: Attendance Statistics + User Activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card-elevated p-5">
          <h2 className="text-lg font-semibold text-gray-800">Attendance Statistics</h2>
          <p className="mt-1 text-sm text-gray-500">Today's student attendance breakdown.</p>
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
          <p className="mt-1 text-sm text-gray-500">Active students who logged attendance today.</p>
          <div className="mt-6 flex items-end gap-6">
            <div>
              <div className="text-4xl font-bold text-green-600">{presentUsers.length}</div>
              <div className="mt-1 text-sm text-gray-500">Logged in today</div>
            </div>
            <div className="mb-1 text-sm text-gray-500">of <strong className="text-gray-700">{activeStudents.length}</strong> active students</div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${activeStudents.length ? Math.round((presentUsers.length / activeStudents.length) * 100) : 0}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {activeStudents.length ? Math.round((presentUsers.length / activeStudents.length) * 100) : 0}% attendance rate
          </div>
          {/* Present Students Detail Table */}
          {presentUsers.length > 0 && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Present Students Detail</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time IN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time OUT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {presentUsers.map((user, index) => (
                        <tr key={`${user.name}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.section}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.timeIn ? formatTime(user.timeIn) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.timeOut ? formatTime(user.timeOut) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.subjectCode} — {user.subjectName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatTime(user.startTime)} – {formatTime(user.endTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Late Students Detail Table */}
          {lateUsers.length > 0 && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Late Students Detail</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time IN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time OUT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lateUsers.map((user, index) => (
                        <tr key={`${user.name}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.section}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.timeIn ? formatTime(user.timeIn) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.timeOut ? formatTime(user.timeOut) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.subjectCode} — {user.subjectName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatTime(user.startTime)} – {formatTime(user.endTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </article>
      </section>

      {/* Section 4: Attendance by Subject */}
      <article className="card-elevated p-5">
        <h2 className="text-lg font-semibold text-gray-800">Attendance by Subject</h2>
        <p className="mt-1 text-sm text-gray-500">Subject-based attendance for today ({todayDayName}). Click a row to expand.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Faculty</th>
                <th className="px-4 py-3 font-medium text-center">Present</th>
                <th className="px-4 py-3 font-medium text-center">Late</th>
                <th className="px-4 py-3 font-medium text-center">Absent</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.length ? subjectStats.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-gray-50 transition hover:bg-gray-50/60 cursor-pointer" onClick={() => setExpandedSubject(expandedSubject === row.id ? null : row.id)}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.subjectCode} — {row.subjectName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.yearLevel.charAt(0)}-{row.section}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(row.startTime)} – {formatTime(row.endTime)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.facultyName}</td>
                    <td className="px-4 py-3 text-center"><span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">{row.present}</span></td>
                    <td className="px-4 py-3 text-center"><span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{row.late}</span></td>
                    <td className="px-4 py-3 text-center"><span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{row.absent}</span></td>
                    <td className="px-4 py-3 text-center font-medium text-gray-700">{row.total}</td>
                  </tr>
                  {expandedSubject === row.id ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-3 bg-gray-50/80">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-2">Present ({row.presentList.length})</div>
                            {row.presentList.length ? row.presentList.map((s, i) => {
    const timeIn = s.timeIn ? formatTime(s.timeIn) : "—";
    const timeOut = s.timeOut ? formatTime(s.timeOut) : "—";
    return (
      <div key={i} className="text-xs text-gray-700 py-0.5">
        {s.name} <br/>
        <span className="text-gray-400">IN: {timeIn}</span> <br/>
        <span className="text-gray-400">OUT: {timeOut}</span>
      </div>
    );
  }) : <div className="text-xs text-gray-400">None</div>}
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">Late ({row.lateList.length})</div>
                            {row.lateList.length ? row.lateList.map((s, i) => {
    const timeIn = s.timeIn ? formatTime(s.timeIn) : "—";
    const timeOut = s.timeOut ? formatTime(s.timeOut) : "—";
    return (
      <div key={i} className="text-xs text-gray-700 py-0.5">
        {s.name} <br/>
        <span className="text-gray-400">IN: {timeIn}</span> <br/>
        <span className="text-gray-400">OUT: {timeOut}</span>
      </div>
    );
  }) : <div className="text-xs text-gray-400">None</div>}
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">Absent ({row.absentList.length})</div>
                            {row.absentList.length ? row.absentList.map((s, i) => (
                              <div key={i} className="text-xs text-gray-700 py-0.5">{s.name}</div>
                            )) : <div className="text-xs text-gray-400">None</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )) : (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No scheduled subjects for today ({todayDayName}).</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Section 5: Daily Attendance Summary — Chart */}
      <article className="card-elevated p-5">
        <h2 className="text-lg font-semibold text-gray-800">Daily Attendance Summary</h2>
        <p className="mt-1 text-sm text-gray-500">Unique student attendees over the past 7 days.</p>
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

      {/* Sections 6, 7, 8: Present / Late / Absent Students */}
      <section className="space-y-4">
        {[
          { title: "Present Students", data: presentUsers, badge: "badge-green", empty: "No students have clocked in today." },
          { title: "Late Students", data: lateUsers, badge: "badge", empty: "No students arrived late today." },
          { title: "Absent Students", data: absentUsers, badge: "badge", empty: "All active students are present today." },
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
                    <th className="px-3 py-2 font-medium">Section</th>
                    {section.title !== "Absent Students" && (
                      <>
                        <th className="px-3 py-2 font-medium">Time IN</th>
                        <th className="px-3 py-2 font-medium">Time OUT</th>
                      </>
                    )}
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Scheduled Time</th>
                  </tr>
                </thead>
                <tbody>
                  {section.data.length ? section.data.map((u, i) => (
                    <tr key={u.userId || u.id || i} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{u.name}</td>
                      <td className="px-3 py-2 text-gray-600">{u.section ? `${u.department ? u.department.charAt(0) : ''}-${u.section}` : (u.department ?? "—")}</td>
                      {section.title !== "Absent Students" && (
                        <>
                          <td className="px-3 py-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[0.65rem] font-medium text-green-700">{formatTime(u.timeIn)}</span></td>
                          <td className="px-3 py-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[0.65rem] font-medium text-green-700">{formatTime(u.timeOut)}</span></td>
                        </>
                      )}
                      <td className="px-3 py-2 text-gray-600">{u.subjectCode ? `${u.subjectCode} — ${u.subjectName}` : "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{u.startTime && u.endTime ? `${formatTime(u.startTime)} – ${formatTime(u.endTime)}` : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={section.title !== "Absent Students" ? 7 : 5} className="px-3 py-6 text-center text-gray-400">{section.empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>
      </>
      ) : null}

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
    </div>
  );
}

function RolePanel({ pageKey, role }) {
  const isDashboard = pageKey === "dashboard";
  // Dashboard fetches real data immediately — skip mock loading so the table renders without flicker
  const mockLoading = useMockLoading(isDashboard || pageKey === "attendance" ? null : 3000, `${role}-${pageKey}`);
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
  const pageSize = 10;

// Schedule and user data for class info
  const { users, session } = useAuth();
  const [scheduleRows, setScheduleRows] = React.useState([]);
  const [scheduleLoading, setScheduleLoading] = React.useState(true);
  const [scheduleError, setScheduleError] = React.useState("");
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  // Fetch schedule data
  React.useEffect(() => {
    let mounted = true;
    const loadSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError("");
      try {
        const data = await apiFetch("/class-schedules.php", refreshVersion ? { cacheTtl: 0 } : {});
        if (mounted) {
          const rows = Array.isArray(data) ? data : [];
          setScheduleRows(role === 'faculty'
            ? rows.filter(row => row.facultyId != null && String(row.facultyId) === String(session?.userId))
            : rows);
        }
      } catch (err) {
        if (mounted) setScheduleError(err.message || "Failed to load schedule.");
      } finally {
        if (mounted) setScheduleLoading(false);
      }
    };
    loadSchedule();
    window.addEventListener('api:recovered', loadSchedule);
    return () => {
      mounted = false;
      window.removeEventListener('api:recovered', loadSchedule);
    };
  }, [refreshVersion, role, session?.userId]);

// Shared admin and faculty attendance page state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [startDate, setStartDate] = React.useState(() => manilaNow().date);
  const [endDate, setEndDate] = React.useState(() => manilaNow().date);
  const [viewMode, setViewMode] = React.useState('live');
  const [attendanceYear, setAttendanceYear] = React.useState('');
  const [attendanceSection, setAttendanceSection] = React.useState('');
  const [attendanceScheduleId, setAttendanceScheduleId] = React.useState('');
  const yearOptions = [...new Set(scheduleRows.map(row => row.yearLevel))].sort();
  const sectionOptions = [...new Set(scheduleRows.filter(row => row.yearLevel === attendanceYear).map(row => row.section))].sort();
  const scheduleOptions = role === 'faculty' ? scheduleRows
    : scheduleRows.filter(row => row.yearLevel === attendanceYear && row.section === attendanceSection);
  const selectedAttendanceSchedule = scheduleOptions.find(row => String(row.id) === attendanceScheduleId);
  const selectedSchedules = React.useMemo(() => selectedAttendanceSchedule ? [selectedAttendanceSchedule] : [], [selectedAttendanceSchedule]);
  const selectedAttendanceWindow = selectedAttendanceSchedule && attendanceWindow(selectedAttendanceSchedule);
  const assignedFaculty = selectedAttendanceSchedule && users.find(user => String(user.id) === String(selectedAttendanceSchedule.facultyId));
  const assignedFacultyName = assignedFaculty
    ? [assignedFaculty.firstName, assignedFaculty.middleName, assignedFaculty.lastName].filter(Boolean).join(' ')
    : selectedAttendanceSchedule?.facultyName || 'No faculty assigned';

  const [loadedPeriod, setLoadedPeriod] = React.useState('');
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [liveCountLogs, setLiveCountLogs] = React.useState([]);
  useManilaClock(); // Keep today's date and class windows current, including Manila midnight.
  const { date: manilaToday, minutes: manilaMinutes } = manilaNow();
  const rangeError = !startDate || !endDate ? 'Select both a start date and an end date.'
    : !datesInRange(startDate, endDate).length ? 'End date must be on or after start date.'
    : endDate > manilaToday ? 'Choose dates up to today.' : '';
  const periodKey = viewMode === 'live' ? `live:${manilaToday}` : `${startDate}:${endDate}`;
  const [classifiedPage, setClassifiedPage] = React.useState(1);
  const classifiedPageSize = 10;

  const fetchAttendanceLogs = React.useCallback(async (date, page, filters = {}) => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const params = new URLSearchParams();
      if (date) {
        params.set("date", date);
      }
      // No limit/offset; fetch all records (filtered by date if provided)
      const result = await apiFetch(`/attendance.php?${params.toString()}`);
      let records = Array.isArray(result.records) ? result.records : [];
      // If backend provides total count, use it; otherwise compute from records length
      const total = result.total !== undefined ? result.total : records.length;
      setAttendanceLogs(records);
      setAttendanceTotal(total);
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

  function formatAttendanceTime(logTime) {
    if (!logTime || !/^\d{2}:\d{2}/.test(logTime)) return logTime || "No Record";
    const [hoursText, minutesText] = logTime.slice(0, 5).split(":");
    const hours = Number(hoursText);
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${minutesText} ${suffix}`;
  }

  // Enable attendance data loading for both staff roles.
  const isAttendancePage = !isDashboard && pageKey === "attendance" && (role === "admin" || role === "faculty");

  React.useEffect(() => {
    if (!isAttendancePage || !selectedAttendanceSchedule || (viewMode !== 'live' && rangeError)) return;
    const controller = new AbortController();
    let active = true;
    const first = viewMode === 'live' ? manilaToday : startDate;
    const last = viewMode === 'live' ? manilaToday : endDate;
    async function load() {
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const options = refreshVersion ? { cacheTtl: 0 } : {};
        const [records, todayRecords] = await Promise.all([
          fetchAttendanceRange(apiFetch, first, last, controller.signal, options),
          first <= manilaToday && last >= manilaToday ? Promise.resolve(null)
            : fetchAttendanceRange(apiFetch, manilaToday, manilaToday, controller.signal, options),
        ]);
        if (!active) return;
        setAttendanceLogs(records);
        setLiveCountLogs(todayRecords ?? records);
        setLoadedPeriod(periodKey);
        setLastUpdated(new Date());
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setAttendanceError(error.message || 'Failed to load attendance records.');
        throw error;
      } finally {
        if (active) setAttendanceLoading(false);
      }
    }
    const stopPolling = startPolling(load, { repeat: viewMode === 'live', initialDelay: refreshVersion ? 0 : 300 });
    return () => {
      active = false;
      stopPolling();
      controller.abort();
    };
  }, [isAttendancePage, selectedAttendanceSchedule, viewMode === 'live', startDate, endDate, manilaToday, periodKey, rangeError, refreshVersion]);

  React.useEffect(() => {
    setAttendancePage(1);
    setClassifiedPage(1);
  }, [viewMode, startDate, endDate, searchTerm, attendanceYear, attendanceSection, attendanceScheduleId]);

  const classified = React.useMemo(() => {
    if (!isAttendancePage || loadedPeriod !== periodKey || (viewMode !== 'live' && rangeError)) {
      return { present: [], late: [], absent: [] };
    }
    return classifyAttendance(attendanceLogs, users, selectedSchedules,
      viewMode === 'live' ? manilaToday : startDate, viewMode === 'live' ? manilaToday : endDate);
  }, [isAttendancePage, viewMode === 'live', loadedPeriod, periodKey, rangeError, attendanceLogs, users, selectedSchedules, startDate, endDate, manilaToday, manilaMinutes]);

  const mergedAttendance = React.useMemo(() => liveAttendance(attendanceLogs, users, isAttendancePage ? selectedSchedules : scheduleRows, manilaToday).filter(entry => !isAttendancePage || (selectedAttendanceSchedule && String(entry.scheduleId) === String(selectedAttendanceSchedule.id))),
    [attendanceLogs, users, scheduleRows, selectedSchedules, selectedAttendanceSchedule, isAttendancePage, manilaToday]);
  const totalAttendancePages = Math.max(1, Math.ceil(mergedAttendance.length / pageSize));

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

  const tableData = React.useMemo(() => {
    const records = searchAttendance(viewMode === 'live' ? mergedAttendance : classified[viewMode] || [], searchTerm);
    const totalPages = Math.max(1, Math.ceil(records.length / classifiedPageSize));
    return { records, currentPage: Math.min(viewMode === 'live' ? attendancePage : classifiedPage, totalPages),
      pageSize: classifiedPageSize, totalPages, hasData: records.length > 0 };
  }, [viewMode, mergedAttendance, classified, searchTerm, attendancePage, classifiedPage]);
  const tableError = (viewMode !== 'live' && rangeError) || attendanceError || scheduleError;
  const tableLoading = !tableError && (attendanceLoading || scheduleLoading || loadedPeriod !== periodKey);
  const attendanceCounts = React.useMemo(() => {
    const studentCount = records => new Set(records.map(entry => String(entry.userId))).size;
    const liveRecords = liveAttendance(liveCountLogs, users, selectedSchedules, manilaToday)
      .filter(entry => entry.scheduleId != null);
    return {
      live: studentCount(liveRecords), present: studentCount(classified.present),
      late: studentCount(classified.late), absent: studentCount(classified.absent),
    };
  }, [liveCountLogs, users, selectedSchedules, manilaToday, classified]);
  const periodLabel = viewMode === 'live' ? `Today · ${manilaToday}` : startDate === endDate ? startDate : `${startDate} – ${endDate}`;

  function handleExportAttendance() {
    if (!selectedAttendanceSchedule || tableLoading || tableError || !tableData.hasData) return;
    const rows = [
      ['Francis Key Attendance Export'],
      ['View', viewMode], ['Start date', viewMode === 'live' ? manilaToday : startDate],
      ['End date', viewMode === 'live' ? manilaToday : endDate], ['Year level', selectedAttendanceSchedule.yearLevel], ['Section', selectedAttendanceSchedule.section],
      ['Schedule', selectedAttendanceSchedule.subjectCode], ['Faculty', assignedFacultyName], ['Search', searchTerm], [],
      ['No.', 'Name', 'ID Number', 'Class', 'Schedule', 'Date', ...(viewMode === 'absent' ? [] : ['Time IN', 'Time OUT']), 'Status', 'Reason'],
      ...tableData.records.map((entry, index) => [index + 1, entry.name, entry.idNumber, entry.classes,
        entry.timeSchedule, entry.logDate, ...(viewMode === 'absent' ? [] : [entry.timeIn, entry.timeOut]), entry.status, entry.reason]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${viewMode}-${viewMode === 'live' ? manilaToday : `${startDate}-to-${endDate}`}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (mockLoading) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-up space-y-4">
      <section className="hero-card overflow-hidden p-6 sm:p-7">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{data.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">{data.description}</p>
        </div>
      </section>

      {isDashboard && (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className="card-elevated p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{metric.label}</div>
            <div className="mt-3 text-2xl font-semibold text-gray-800">{metric.value}</div>
            <div className="mt-2 text-sm text-gray-500">{metric.hint}</div>
          </article>
        ))}
      </section>

      )}

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
        <section className="card-elevated overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-800">Select a class</h2>
            <p className="mt-1 text-sm text-gray-500">{role === 'faculty' ? 'Choose one of your assigned classes to view student attendance.' : 'Choose a year level, section, and schedule to view student attendance.'}</p>
            <div className={clsx('mt-5 grid gap-4', role === 'faculty' ? 'w-full max-w-sm' : 'md:grid-cols-3')}>
              {role !== 'faculty' && <>
              <label className="block text-sm font-medium text-gray-700">1. Year Level
                <select value={attendanceYear} disabled={scheduleLoading} onChange={event => {
                  setAttendanceYear(event.target.value); setAttendanceSection(''); setAttendanceScheduleId('');
                }} className="form-input mt-2 w-full rounded-lg px-3 py-2.5 text-sm disabled:opacity-50">
                  <option value="">Select year level</option>
                  {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">2. Section
                <select value={attendanceSection} disabled={!attendanceYear || scheduleLoading} onChange={event => {
                  setAttendanceSection(event.target.value); setAttendanceScheduleId('');
                }} className="form-input mt-2 w-full rounded-lg px-3 py-2.5 text-sm disabled:opacity-50">
                  <option value="">Select section</option>
                  {sectionOptions.map(section => <option key={section} value={section}>Section {section}</option>)}
                </select>
              </label>
              </>}
              <label className="block text-sm font-medium text-gray-700">{role === 'faculty' ? 'Your Schedule' : '3. Schedule'}
                <select value={selectedAttendanceSchedule ? attendanceScheduleId : ''} disabled={scheduleLoading || (role !== 'faculty' && !attendanceSection)} onChange={event => setAttendanceScheduleId(event.target.value)}
                  className="form-input mt-2 w-full rounded-lg px-3 py-2.5 text-sm disabled:opacity-50">
                  <option value="">{role === 'faculty' ? 'Select your assigned schedule' : 'Select schedule'}</option>
                  {scheduleOptions.map(schedule => <option key={schedule.id} value={schedule.id}>
                    {schedule.subjectCode} - {schedule.subjectName}
                  </option>)}
                </select>
              </label>
            </div>
            {selectedAttendanceSchedule && <dl aria-label="Selected schedule details" className="mt-5 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
              {role === 'faculty' && <>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Year level</dt>
                  <dd className="mt-2 text-sm font-medium text-gray-800">{selectedAttendanceSchedule.yearLevel}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Section</dt>
                  <dd className="mt-2 text-sm font-medium text-gray-800">{selectedAttendanceSchedule.section}</dd>
                </div>
              </>}
              <div className="min-w-0">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><CalendarDays size={15} aria-hidden="true" />Schedule days</dt>
                <dd className="mt-2 text-sm font-medium text-gray-800">{selectedAttendanceSchedule.days.join(', ') || 'No days assigned'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><Clock size={15} aria-hidden="true" />Schedule time</dt>
                <dd className="mt-2 text-sm font-medium text-gray-800">{attendanceTime(selectedAttendanceSchedule.startTime)} – {attendanceTime(selectedAttendanceSchedule.endTime)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><UserRound size={15} aria-hidden="true" />Assigned faculty</dt>
                <dd className="mt-2 break-words text-sm font-medium text-gray-800">{assignedFacultyName}</dd>
              </div>
            </dl>}
            {selectedAttendanceWindow && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800">
              <span><strong>Present:</strong> {selectedAttendanceWindow.presentLabel}</span>
              <span><strong>Late:</strong> {selectedAttendanceWindow.lateLabel}</span>
              <span><strong>Absent:</strong> No check-in by the late cutoff.</span>
            </div>}
          </div>
          {selectedAttendanceSchedule && <>
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-3 gap-y-4 rounded-xl bg-gray-100 p-2" role="tablist" aria-label="Attendance view">
                {[
                  { value: 'live', label: 'Live', Icon: Activity },
                  { value: 'present', label: 'Present', Icon: CircleCheck },
                  { value: 'late', label: 'Late', Icon: Clock },
                  { value: 'absent', label: 'Absent', Icon: CircleX },
                ].map(({ value, label, Icon }) => (
                  <button key={value} type="button" role="tab" id={`attendance-tab-${value}`}
                    aria-selected={viewMode === value} aria-controls="attendance-results"
                    onClick={() => setViewMode(value)}
                    className={clsx('relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-green-600',
                      viewMode === value ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-white/60 hover:text-gray-800')}>
                    <Icon size={16} />{label}
                    <span aria-label={tableLoading || tableError ? 'Student count unavailable' : `${attendanceCounts[value]} students`}
                      title={value === 'live' ? 'Students checked in today' : `Students marked ${label.toLowerCase()} for the attendance period`}
                      className="pointer-events-none absolute -right-2 -top-2 z-10 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_5px_rgba(220,38,38,0.25)] tabular-nums">
                      {tableLoading || tableError ? '—' : attendanceCounts[value]}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleExportAttendance}
                disabled={tableLoading || Boolean(tableError) || !tableData.hasData}
                className="btn btn-primary inline-flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">
                <FileBarChart size={16} />Export
              </button>
            </div>

            <div className="mt-5 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className={clsx('block', viewMode === 'live' ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2')}>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Search records</span>
                <input type="search" value={searchTerm} placeholder="Search by student name or ID number"
                  onChange={event => setSearchTerm(event.target.value)}
                  className="form-input w-full rounded-lg px-3 py-2.5 text-sm" />
              </label>
              {viewMode !== 'live' && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">From date</span>
                    <input type="date" value={startDate} max={endDate || manilaToday}
                      aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'attendance-range-error' : undefined}
                      onChange={event => setStartDate(event.target.value)}
                      className="form-input w-full rounded-lg px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">To date</span>
                    <input type="date" value={endDate} min={startDate} max={manilaToday}
                      aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'attendance-range-error' : undefined}
                      onChange={event => setEndDate(event.target.value)}
                      className="form-input w-full rounded-lg px-3 py-2.5 text-sm" />
                  </label>
                </>
              )}
              {viewMode === 'live' && (
                <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />Today only
                </div>
              )}
            </div>
            {viewMode !== 'live' && rangeError && <p id="attendance-range-error" role="alert" className="mt-3 text-sm text-red-600">{rangeError}</p>}
          </div>

          <div id="attendance-results" role="tabpanel" aria-labelledby={`attendance-tab-${viewMode}`} aria-busy={tableLoading}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">{viewMode === 'live' ? 'Live attendance' : `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} attendance`}</h2>
                <p className="mt-1 text-xs text-gray-500">{periodLabel}{viewMode !== 'live' && ' · Inclusive date range'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{tableLoading || tableError ? '—' : tableData.records.length} records</span>
                <button type="button" title="Refresh attendance" aria-label="Refresh attendance"
                  onClick={() => setRefreshVersion(value => value + 1)} disabled={tableLoading || (viewMode !== 'live' && Boolean(rangeError))}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw size={15} className={tableLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            {tableError ? (
              <div role="alert" className="mx-5 mb-5 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{tableError}</div>
            ) : (tableLoading && loadedPeriod !== periodKey) || scheduleLoading ? (
              <div className="px-5 py-16 text-center text-sm text-gray-500">Loading attendance records…</div>
            ) : !tableData.hasData ? (
              <div className="flex flex-col items-center border-t border-gray-100 px-5 py-16 text-center">
                <CalendarDays size={30} className="mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No {viewMode === 'live' ? '' : `${viewMode} `}attendance records</p>
                <p className="mt-1 text-sm text-gray-500">{searchTerm ? 'Try a different name or ID number.' : viewMode === 'live' ? 'Today’s check-ins will appear here automatically.' : 'No matching records for this date range.'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border-y border-gray-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        {['#', 'Student', 'Class / Schedule', 'Date', ...(viewMode === 'absent' ? [] : ['Time in', 'Time out']), 'Status', 'Details'].map(label => (
                          <th key={label} scope="col" className="whitespace-nowrap px-5 py-3.5 font-semibold">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tableData.records.slice((tableData.currentPage - 1) * tableData.pageSize, tableData.currentPage * tableData.pageSize).map((entry, index) => (
                        <tr key={entry.key} className="transition hover:bg-gray-50/80">
                          <td className="px-5 py-4 text-xs text-gray-400">{(tableData.currentPage - 1) * tableData.pageSize + index + 1}</td>
                          <td className="px-5 py-4"><p className="whitespace-nowrap font-medium text-gray-800">{entry.name}</p><p className="mt-1 text-xs text-gray-500">{entry.idNumber || '—'}</p></td>
                          <td className="px-5 py-4"><p className="min-w-40 font-medium text-gray-700">{entry.classes}</p><p className="mt-1 whitespace-nowrap text-xs text-gray-500">{entry.timeSchedule}</p></td>
                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">{entry.logDate}</td>
                          {viewMode !== 'absent' && <>
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-700">{entry.timeIn || '—'}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">{entry.timeOut || '—'}</td>
                          </>}
                          <td className="px-5 py-4"><span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                            entry.status === 'Present' ? 'bg-green-50 text-green-700' : entry.status === 'Late' ? 'bg-amber-50 text-amber-700' : entry.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600')}>{entry.status}</span></td>
                          <td className="px-5 py-4 text-xs text-gray-500">{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-gray-500">Showing {(tableData.currentPage - 1) * tableData.pageSize + 1}–{Math.min(tableData.currentPage * tableData.pageSize, tableData.records.length)} of {tableData.records.length} records</p>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={tableData.currentPage === 1}
                      onClick={() => viewMode === 'live' ? setAttendancePage(tableData.currentPage - 1) : setClassifiedPage(tableData.currentPage - 1)}
                      className="btn btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    <span className="text-xs text-gray-500">Page {tableData.currentPage} of {tableData.totalPages}</span>
                    <button type="button" disabled={tableData.currentPage === tableData.totalPages}
                      onClick={() => viewMode === 'live' ? setAttendancePage(tableData.currentPage + 1) : setClassifiedPage(tableData.currentPage + 1)}
                      className="btn btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                  </div>
                </div>
              </>
            )}
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-xs text-gray-500 sm:px-6">
              {viewMode === 'live'
                ? `Refreshes every 60 seconds while this tab is visible and online${lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}` : ''}`
                : 'Based on current class schedules and student sections. Today’s absences appear after the check-in cutoff for each class schedule.'}
            </div>
          </div>
          </>}
          {!selectedAttendanceSchedule && <div className="px-6 py-14 text-center">
            {scheduleError ? <p role="alert" className="text-sm text-red-600">{scheduleError}</p>
              : <><CalendarDays size={30} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">{scheduleLoading ? 'Loading class schedules...' : yearOptions.length ? 'Select a schedule to continue' : 'No class schedules available'}</p>
                <p className="mt-1 text-sm text-gray-500">{!scheduleLoading && !yearOptions.length ? role === 'faculty' ? 'No classes are assigned to you yet. Contact an administrator to assign your schedules.' : 'Create a class schedule before viewing attendance.' : 'Attendance views will appear after you select your class.'}</p></>}
          </div>}
        </section>
      )}
    </div>
  );
}

function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const clock = useManilaClock();
  const [scheduleRows, setScheduleRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [attendanceRecords, setAttendanceRecords] = React.useState([]);
  const [attendanceLoading, setAttendanceLoading] = React.useState(true);
  const [attendanceError, setAttendanceError] = React.useState("");

  const dayNameMap = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };

  function getManilaDayName() {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    return dayNameMap[now.getDay()] || "";
  }

  function getManilaDate() {
    const d = new Date();
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  function formatTime(timeStr) {
    if (!timeStr || !/^\d{2}:\d{2}/.test(timeStr)) return "—";
    const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  function displayTime(value) {
    return value ? formatTime(value) : "--:--";
  }

  function parseStudentDept(dept) {
    if (!dept) return null;
    const yearMap = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
    // "1st Year - C" style (digit, anything, dash, letter at end)
    const fullMatch = dept.match(/(\d)[^-]*-\s*([A-E])$/i);
    if (fullMatch) {
      return { yearLevel: yearMap[parseInt(fullMatch[1], 10)] || null, section: fullMatch[2].toUpperCase() };
    }
    // "BSIT 3A" style (digit immediately before letter at end)
    const shortMatch = dept.match(/(\d)\s*([A-E])$/i);
    if (shortMatch) {
      return { yearLevel: yearMap[parseInt(shortMatch[1], 10)] || null, section: shortMatch[2].toUpperCase() };
    }
    return null;
  }

  const parsedSection = React.useMemo(() => parseStudentDept(currentUser?.department), [currentUser?.department]);

  const loadSchedule = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/class-schedules.php");
      setScheduleRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Only show schedules that belong to the student's detected section + year level.
  const mySchedule = React.useMemo(() => {
    if (!parsedSection) return [];
    return scheduleRows.filter(
      (row) => row.yearLevel === parsedSection.yearLevel && row.section === parsedSection.section,
    );
  }, [scheduleRows, parsedSection]);

  const todayDayName = React.useMemo(() => getManilaDayName(), []);

  // Daily view: only today's classes — never other days of the week.
  const todaysSchedule = React.useMemo(
    () =>
      mySchedule
        .filter((row) => Array.isArray(row.days) && row.days.includes(todayDayName))
        .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0)),
    [mySchedule, todayDayName],
  );

  // ── Attendance overview ──
  const todayDate = React.useMemo(() => getManilaDate(), []);

  const loadAttendance = React.useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const result = await apiFetch(`/attendance.php?date=${todayDate}&limit=500&offset=0`);
      setAttendanceRecords(Array.isArray(result?.records) ? result.records : []);
    } catch (err) {
      setAttendanceRecords([]);
      setAttendanceError(err.message || "Failed to load attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  }, [todayDate]);

  React.useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Only the signed-in student's own records for today.
  const myAttendance = React.useMemo(
    () => attendanceRecords.filter((r) => r.userId === currentUser?.id),
    [attendanceRecords, currentUser],
  );

  // Time In = earliest IN record today; Time Out = latest OUT record today.
  const timeIn = React.useMemo(() => {
    const ins = myAttendance.filter((r) => r.status === "IN").map((r) => r.logTime).filter(Boolean);
    return ins.length ? ins.sort()[0] : null;
  }, [myAttendance]);

  const timeOut = React.useMemo(() => {
    const outs = myAttendance.filter((r) => r.status === "OUT").map((r) => r.logTime).filter(Boolean);
    return outs.length ? outs.sort()[outs.length - 1] : null;
  }, [myAttendance]);

  // Per-class attendance status — applied to each subject in Today's Schedule.
  // No check-in today = Absent; check-in within or before the class window (start + 15 min) = Present;
  // check-in after that window = Late.
  function getClassStatus(entry) {
    if (!timeIn) return "absent";
    const inMin = timeToMinutes(timeIn);
    const startMin = timeToMinutes(entry.startTime);
    if (inMin == null || startMin == null) return "present";
    return inMin <= startMin + 15 ? "present" : "late";
  }

  // On-time window for a class: start ± 15 minutes (mirrors getClassStatus).
  function getOnTimeWindow(entry) {
    const startMin = timeToMinutes(entry.startTime);
    if (startMin == null) return null;
    const toHHMM = (mins) => {
      const h = ((Math.floor(mins / 60) % 24) + 24) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    return { start: toHHMM(startMin - 15), end: toHHMM(startMin + 15) };
  }

  return (
    <div className="animate-fade-up space-y-4">
      {/* Big real-time digital clock */}
      <section className="hero-card overflow-hidden p-5 text-center sm:p-8">
        <div className="font-mono text-5xl font-bold leading-none text-white tabular-nums sm:text-7xl">
          {clock.time}
        </div>
        <div className="mt-3 text-sm text-white/70 sm:text-base">{clock.date}</div>
      </section>

      {/* Subject schedule */}
      <section>
        <article className="card-elevated p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Today's Schedule</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-500">
                <CalendarDays size={14} className="text-gray-400" />
                {parsedSection
                  ? `${parseInt(parsedSection.yearLevel, 10) || parsedSection.yearLevel}-${parsedSection.section}`
                  : "Your daily class schedule"}
              </p>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={loadSchedule}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800"
                title="Refresh schedule"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {error ? (
            <div className="mt-5 alert alert-error text-center">
              <p className="text-sm font-semibold">Failed to load your schedule</p>
              <p className="mt-2 text-xs text-gray-500">{error}</p>
              <button
                type="button"
                onClick={loadSchedule}
                className="btn btn-secondary mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Loading your schedule...
            </div>
          ) : !parsedSection ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              We couldn't detect a class section on your account. Ask an administrator to set your section (e.g. BSIT 3A)
              on your profile.
            </div>
          ) : todaysSchedule.length === 0 ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No classes scheduled for {todayDayName} — enjoy your day off!
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {todaysSchedule.map((entry) => {
                const entryStatus = getClassStatus(entry);
                const statusCfg = attendanceStatusConfig[entryStatus];
                const StatusIcon = statusCfg.Icon;
                const onTimeWindow = getOnTimeWindow(entry);
                return (
                  <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold leading-snug text-gray-800">{entry.subjectName}</h3>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-sm font-bold text-green-700">
                          <Clock size={15} className="shrink-0" />
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </div>
                      </div>
                      <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusCfg.pill}`}>
                        <StatusIcon size={14} className={statusCfg.iconCls} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {entry.facultyName ? (
                      <div className="mt-2 text-xs text-gray-400">Instructor: {entry.facultyName}</div>
                    ) : null}

                    {attendanceError ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                        <span className="text-xs text-red-600">Attendance unavailable</span>
                        <button type="button" onClick={loadAttendance} className="text-xs font-semibold text-red-600 underline">
                          Retry
                        </button>
                      </div>
                    ) : attendanceLoading ? (
                      <div className="mt-3 space-y-2">
                        <div className="skeleton h-9" />
                        <div className="skeleton h-6" />
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-gray-400">
                            <LogIn size={12} className="text-green-600" />
                            Time In
                          </div>
                          <div className="mt-1 text-sm font-semibold tabular-nums text-gray-800">{displayTime(timeIn)}</div>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-gray-400">
                            <LogOut size={12} className="text-amber-500" />
                            Time Out
                          </div>
                          <div className="mt-1 text-sm font-semibold tabular-nums text-gray-800">{displayTime(timeOut)}</div>
                        </div>
                      </div>
                    )}
                    {onTimeWindow && (
                      <p className="mt-3 flex items-start gap-1.5 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400">
                        <Info size={13} className="mt-0.5 shrink-0 text-gray-300" />
                        Please check in between {formatTime(onTimeWindow.start)} to {formatTime(onTimeWindow.end)} to be marked Present, otherwise you'll be marked Late or Absent.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function StudentAttendancePage() {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const d = new Date();
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  });
  const [scheduleLoading, setScheduleLoading] = React.useState(true);
  const [scheduleError, setScheduleError] = React.useState("");
  const [attendanceLoading, setAttendanceLoading] = React.useState(true);
  const [attendanceError, setAttendanceError] = React.useState("");

  const dayNameMap = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };

  function getTodayDate() {
    const d = new Date();
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  }

  function getDayName(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return dayNameMap[d.getDay()] || "";
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  function formatTime(timeStr) {
    if (!timeStr || !/^\d{2}:\d{2}/.test(timeStr)) return "—";
    const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  function displayTime(value) {
    return value ? formatTime(value) : "--:--";
  }

  function parseStudentDept(dept) {
    if (!dept) return null;
    const yearMap = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
    const fullMatch = dept.match(/(\d)[^-]*-\s*([A-E])$/i);
    if (fullMatch) {
      return { yearLevel: yearMap[parseInt(fullMatch[1], 10)] || null, section: fullMatch[2].toUpperCase() };
    }
    const shortMatch = dept.match(/(\d)\s*([A-E])$/i);
    if (shortMatch) {
      return { yearLevel: yearMap[parseInt(shortMatch[1], 10)] || null, section: shortMatch[2].toUpperCase() };
    }
    return null;
  }

  const loadSchedules = React.useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const data = await apiFetch("/class-schedules.php");
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      setScheduleError(err.message || "Failed to load schedules.");
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const loadAttendance = React.useCallback(async (date) => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const result = await apiFetch(`/attendance.php?date=${date}&limit=500&offset=0`);
      setAttendance(Array.isArray(result?.records) ? result.records : []);
    } catch (err) {
      setAttendance([]);
      setAttendanceError(err.message || "Failed to load attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate, loadAttendance]);

  const parsedSection = React.useMemo(() => parseStudentDept(currentUser?.department), [currentUser?.department]);
  const selectedDayName = React.useMemo(() => getDayName(selectedDate), [selectedDate]);

  const myAttendance = React.useMemo(
    () => attendance.filter((r) => r.userId === currentUser?.id),
    [attendance, currentUser],
  );

  // Time In = earliest IN record on the selected date; Time Out = latest OUT record.
  const timeIn = React.useMemo(() => {
    const ins = myAttendance.filter((r) => r.status === "IN").map((r) => r.logTime).filter(Boolean);
    return ins.length ? ins.sort()[0] : null;
  }, [myAttendance]);

  const timeOut = React.useMemo(() => {
    const outs = myAttendance.filter((r) => r.status === "OUT").map((r) => r.logTime).filter(Boolean);
    return outs.length ? outs.sort()[outs.length - 1] : null;
  }, [myAttendance]);

  // Only the student's section schedules that meet on the selected date, in time order.
  const rows = React.useMemo(() => {
    if (!parsedSection) return [];
    return schedules
      .filter((s) => {
        const days = Array.isArray(s.days) ? s.days : [];
        return (
          s.yearLevel === parsedSection.yearLevel &&
          s.section === parsedSection.section &&
          days.includes(selectedDayName)
        );
      })
      .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0))
      .map((s) => {
        let status = "absent";
        if (timeIn) {
          const inMin = timeToMinutes(timeIn);
          const startMin = timeToMinutes(s.startTime);
          if (inMin != null && startMin != null) status = inMin <= startMin + 15 ? "present" : "late";
        }
        return { ...s, status };
      });
  }, [schedules, parsedSection, selectedDayName, timeIn]);

  const loading = scheduleLoading || attendanceLoading;
  const loadError = scheduleError || attendanceError;
  const handleRetry = () => {
    loadSchedules();
    loadAttendance(selectedDate);
  };

  return (
    <div className="animate-fade-up space-y-4">
      <section>
        <article className="card-elevated p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">My Attendance</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-500">
                <CalendarDays size={14} className="text-gray-400" />
                {selectedDayName}
                {parsedSection
                  ? ` · ${parseInt(parsedSection.yearLevel, 10) || parsedSection.yearLevel}-${parsedSection.section}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                max={getTodayDate()}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="form-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm sm:flex-initial"
              />
              <button
                type="button"
                onClick={() => loadAttendance(selectedDate)}
                disabled={attendanceLoading}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                title="Refresh attendance"
              >
                <RefreshCw size={16} className={attendanceLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="mt-5 alert alert-error text-center">
              <p className="text-sm font-semibold">Failed to load attendance</p>
              <p className="mt-2 text-xs text-gray-500">{loadError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="btn btn-secondary mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="mt-5 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-12" />
              ))}
            </div>
          ) : !parsedSection ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              We couldn't detect a class section on your account. Ask an administrator to set your section (e.g. BSIT 3A)
              on your profile.
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No classes scheduled for {selectedDayName}. Pick another date to view its attendance.
            </div>
          ) : (
            <div className="mt-5 table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Faculty</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const statusCfg = attendanceStatusConfig[row.status];
                    const StatusIcon = statusCfg.Icon;
                    return (
                      <tr key={row.id}>
                        <td className="font-medium text-gray-800">{row.subjectName}</td>
                        <td>{row.facultyName || "—"}</td>
                        <td>
                          <span className="time-in-badge whitespace-nowrap">{displayTime(timeIn)}</span>
                        </td>
                        <td>
                          <span className="time-out-badge whitespace-nowrap">{displayTime(timeOut)}</span>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.pill}`}>
                            <StatusIcon size={13} className={statusCfg.iconCls} />
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
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
    <div className="academic-page animate-fade-up space-y-5">
      <HeaderBlock
        title="Class Subjects"
        description="Organize your curriculum by year level and semester."
        rightContent={(
          <button type="button" onClick={() => {
            setEditingId(null);
            setForm(emptyClassSubjectForm);
            setIsSubjectModalOpen(true);
          }} className="btn btn-secondary w-full justify-center whitespace-nowrap lg:w-auto">
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> Add Subject
          </button>
        )}
      />

      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <AcademicRecordsCard title="Subject Directory" description="Browse subjects grouped by year level and semester." icon={BookOpenText}
        count={subjects.length} visibleCount={filteredSubjects.length} recordLabel="subjects"
        search={search} onSearch={setSearch} searchPlaceholder="Search code, name, year, or semester..." loading={loading}>
          {pageError ? (
            <div role="alert" className="alert alert-error mx-5 my-4">
              {pageError}
            </div>
          ) : null}

          <div className="academic-table-scroll" role="region" aria-label="Class subject table" tabIndex={0}>
            <table className="table academic-table academic-subject-table">
              <caption className="sr-only">Subjects grouped by year level and semester</caption>
              <thead className="">
                <tr>
                  <th scope="col" className="px-4 py-3">Code</th>
                  <th scope="col" className="px-4 py-3">Subject Name</th>
                  <th scope="col" className="academic-actions-heading w-[1%] px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="academic-empty">
                      Loading class subjects...
                    </td>
                  </tr>
                ) : sectionedSubjects.length ? (
                  sectionedSubjects.map((section) => (
                    <React.Fragment key={section.key}>
                      <tr className="academic-group-row">
                        <td colSpan="3" className="px-4 py-3">
                          <div className="flex items-center gap-3"><span>{section.label}</span><span className="academic-count">{section.items.length} subjects</span></div>
                        </td>
                      </tr>
                      {section.items.map((subject) => (
                        <tr key={subject.id}>
                          <td className="px-4 py-3 font-semibold text-gray-800">{subject.subjectCode}</td>
                          <td className="px-4 py-3">{subject.subjectName}</td>
                          <td className="w-[1%] px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEdit(subject)}
                                aria-label={`Edit ${subject.subjectCode}`}
                                className="btn btn-secondary text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSubject(subject)}
                                aria-label={`Delete ${subject.subjectCode}`}
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
                    <td colSpan="3" className="academic-empty">
                      {search.trim() ? "No matching class subjects found." : "No class subjects found yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </AcademicRecordsCard>

      {isSubjectModalOpen ? (
        <AcademicModal
              title={editingId ? "Edit Class Subject" : "Add Class Subject"}
             onClose={resetForm}>
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
                  label="Semester"
                  value={form.semester}
                  onChange={(value) => setForm((prev) => ({ ...prev, semester: value }))}
                  options={[
                    { label: "Select semester", value: "" },
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
                    </AcademicModal>
      ) : null}

      {deletingSubject ? (
        <AcademicModal centered
              title="Delete Class Subject"
              subtitle={`Are you sure you want to delete ${deletingSubject.subjectCode} - ${deletingSubject.subjectName}?`}
             onClose={() => setDeletingSubject(null)}>
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
                    </AcademicModal>
      ) : null}
    </div>
  );
}

function ClassSchedulingPage() {
  const { users } = useAuth();
  const [search, setSearch] = React.useState("");
  const facultyUsers = React.useMemo(
    () => users.filter((u) => u.role === "faculty" && u.status === "Active"),
    [users],
  );

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
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = React.useState(false);
  const [viewStudentsData, setViewStudentsData] = React.useState(null); // { schedules: [], students: [] }
  const [viewStudentsLoading, setViewStudentsLoading] = React.useState(false);
  const [viewStudentsError, setViewStudentsError] = React.useState("");

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
          ? data.subjects.map((subject) => {
              const editingItem =
                editingSchedule?.yearLevel === form.yearLevel && editingSchedule?.semester === form.semester
                  ? editingSchedule.items.find((item) => Number(item.subjectId) === Number(subject.id))
                  : null;
              return {
                subjectId: subject.id,
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                startTime: editingItem ? normalizeTimeInputValue(editingItem.startTime) : "",
                endTime: editingItem ? normalizeTimeInputValue(editingItem.endTime) : "",
                facultyId: editingItem?.facultyId ? Number(editingItem.facultyId) : "",
                facultyName: editingItem?.facultyName ?? "",
              };
            })
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

  const selectedFacultyIds = React.useMemo(
    () => new Set(subjectEntries.map((e) => e.facultyId).filter(Boolean)),
    [subjectEntries],
  );

  const validateSchedule = React.useCallback(() => {
    if (!form.section) return "Section is required";
    if (!form.yearLevel) return "Year level is required";
    if (!form.semester) return "Semester is required";
    if (!form.days.length) return "Please select at least one day.";
    if (!subjectEntries.length) return "No subjects are available for the selected year level and semester.";

    const windows = [];
    for (const entry of subjectEntries) {
      if (!entry.startTime || !entry.endTime) return "Start and end times are required";
      if (!entry.facultyId) return `Faculty is required for ${entry.subjectCode}.`;

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

  const visibleScheduleGroups = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groupedScheduleRows;
    return groupedScheduleRows.filter((group) =>
      [group.label, ...group.items.flatMap((row) => [row.subjectCode, row.subjectName, row.facultyName, ...(Array.isArray(row.days) ? row.days : []), formatScheduleDays(row.days)])]
        .filter(Boolean).join(" ").toLowerCase().includes(keyword)
    );
  }, [groupedScheduleRows, search]);
  const visibleScheduleCount = visibleScheduleGroups.reduce((count, group) => count + group.items.length, 0);

  const handleEntryChange = (subjectId, field, value) => {
    setOverlapSubjectIds((prev) => prev.filter((id) => id !== subjectId));
    setSubjectEntries((prev) =>
      prev.map((entry) => {
        if (entry.subjectId !== subjectId) return entry;
        if (field === "facultyId") {
          const selectedFaculty = facultyUsers.find((f) => Number(f.id) === Number(value));
          return {
            ...entry,
            facultyId: value ? Number(value) : "",
            facultyName: selectedFaculty
              ? `${selectedFaculty.firstName} ${selectedFaculty.middleName ? selectedFaculty.middleName + " " : ""}${selectedFaculty.lastName}`
              : "",
          };
        }
        return { ...entry, [field]: value };
      }),
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
            facultyId: entry.facultyId || null,
            facultyName: entry.facultyName || "",
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

  const handleViewStudents = async (group) => {
    setViewStudentsLoading(true);
    setViewStudentsError("");
    try {
      // Fetch schedules for the section (we can use the existing scheduleRows state)
      const schedulesForSection = scheduleRows.filter(
        (row) =>
          row.section === group.section &&
          row.yearLevel === group.yearLevel &&
          row.semester === group.semester
      );

      // Get active students for the section from the users state (already fetched)
      const targetDepartment = `${group.yearLevel} - ${group.section}`;
      const activeStudents = users.filter(
        (user) =>
          user.role === "student" &&
          user.status === "Active" &&
          user.department === targetDepartment
      );

      // Sort students by last name, then first name
      const sortedStudents = activeStudents.sort((a, b) => {
        const lastNameA = a.lastName.toLowerCase();
        const lastNameB = b.lastName.toLowerCase();
        if (lastNameA !== lastNameB) return lastNameA.localeCompare(lastNameB);
        const firstNameA = a.firstName.toLowerCase();
        const firstNameB = b.firstName.toLowerCase();
        return firstNameA.localeCompare(firstNameB);
      });

      // Format student names to "LASTNAME, FIRSTNAME, MIDDLE NAME"
      const formattedStudents = sortedStudents.map(student => {
        const lastName = student.lastName ?? '';
        const firstName = student.firstName ?? '';
        const middleName = student.middleName ?? '';
        const nameParts = [lastName, firstName, middleName].filter(part => part !== '');
        const formattedName = nameParts.join(', ');
        return {
          ...student,
          formattedName: formattedName
        };
      });

      setViewStudentsData({
        schedules: schedulesForSection,
        students: formattedStudents,
        sectionHeading: `${group.yearLevel} - ${group.section}`
      });
      setIsViewStudentsModalOpen(true);
    } catch (error) {
      setViewStudentsError(error.message || "Failed to load data for View Students modal.");
    } finally {
      setViewStudentsLoading(false);
    }
  };

  return (
    <div className="academic-page animate-fade-up space-y-5">
      <HeaderBlock
        title="Class Scheduling"
        description="Manage section schedules, faculty assignments, and student rosters."
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
            className="btn btn-secondary w-full justify-center whitespace-nowrap lg:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> Add Schedule
          </button>
        )}
      />

      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <AcademicRecordsCard title="Schedule Directory" description="Schedules grouped by section, year level, and semester." icon={CalendarRange}
        count={scheduleRows.length} visibleCount={visibleScheduleCount} recordLabel="schedules"
        search={search} onSearch={setSearch} searchPlaceholder="Search section, subject, faculty, or day..." loading={loadingRows}>
          {pageError ? (
            <div role="alert" className="alert alert-error mx-5 my-4">
              {pageError}
            </div>
          ) : null}

          <div className="academic-table-scroll" role="region" aria-label="Class schedule table" tabIndex={0}>
            <table className="table academic-table academic-schedule-table">
              <caption className="sr-only">Class schedules grouped by section</caption>
              <thead className="">
                <tr>
                  <th scope="col" className="px-4 py-3">Code</th>
                  <th scope="col" className="px-4 py-3">Subject Name</th>
                  <th scope="col" className="px-4 py-3">Faculty</th>
                  <th scope="col" className="px-4 py-3">Days</th>
                  <th scope="col" className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan="5" className="academic-empty">
                      Loading class schedules...
                    </td>
                  </tr>
                ) : visibleScheduleGroups.length ? (
                  visibleScheduleGroups.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="academic-group-row">
                        <td colSpan="5" className="px-4 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3"><span>{group.label}</span><span className="academic-count">{group.items.length} classes</span></div>
                            <div className="inline-flex items-center justify-center gap-2 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(group)}
                                aria-label={`Edit ${group.label}`}
                                className="btn btn-secondary text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewStudents(group)}
                                className="btn btn-secondary text-xs"
                              >
                                View Students
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSchedule(group)}
                                aria-label={`Delete ${group.label}`}
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
                          <td className="px-4 py-3">{row.facultyName || "—"}</td>
                          <td className="px-4 py-3">{formatScheduleDays(row.days)}</td>
                          <td className="px-4 py-3">{formatTimeRange(row.startTime, row.endTime)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="academic-empty">
                      {search.trim() ? "No matching schedules found. Try a different search." : "No class schedules yet. Add a schedule to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </AcademicRecordsCard>

      {isScheduleModalOpen ? (
        <AcademicModal title={editingSchedule ? "Edit Schedule" : "Add Schedule"} onClose={resetScheduleForm}>
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
                            <div className="mt-3">
                              <SelectField
                                label="Faculty"
                                value={entry.facultyId}
                                onChange={(value) => handleEntryChange(entry.subjectId, "facultyId", value)}
                                options={[
                                  { label: "Select faculty", value: "" },
                                  ...facultyUsers
                                    .filter((f) => !selectedFacultyIds.has(Number(f.id)) || Number(f.id) === Number(entry.facultyId))
                                    .map((f) => ({
                                      label: `${f.firstName} ${f.middleName ? f.middleName + " " : ""}${f.lastName}`,
                                      value: f.id,
                                    })),
                                ]}
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
                      </AcademicModal>
      ) : null}

      {deletingSchedule ? (
        <AcademicModal centered
              title="Delete Class Schedule"
              subtitle={`Are you sure you want to delete Section ${deletingSchedule.section} - ${deletingSchedule.yearLevel} (${deletingSchedule.semester})?`}
             onClose={() => setDeletingSchedule(null)}>
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
                    </AcademicModal>
      ) : null}
      {isViewStudentsModalOpen ? (
        <AcademicModal title="View Students" subtitle="Section roster and class schedule" onClose={() => setIsViewStudentsModalOpen(false)}>
          <div className="space-y-6">

              {viewStudentsLoading ? (
                <p role="status" className="py-8 text-center text-sm text-gray-500">Loading section details...</p>
              ) : viewStudentsError ? (
                <div role="alert" className="alert alert-error">{viewStudentsError}</div>
              ) : viewStudentsData ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-100 bg-green-50 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Section overview</p>
                      <h3 className="mt-1 text-xl font-semibold text-gray-900">
                        Section {viewStudentsData.schedules[0]?.yearLevel?.charAt(0)}-{viewStudentsData.schedules[0]?.section}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {viewStudentsData.sectionHeading} &middot; {viewStudentsData.schedules[0]?.semester}
                      </p>
                    </div>
                    <div className="flex gap-6 text-sm sm:gap-8">
                      <div><p className="text-2xl font-semibold tabular-nums text-green-800">{viewStudentsData.students.length}</p><p className="text-gray-600">Active students</p></div>
                      <div><p className="text-2xl font-semibold tabular-nums text-green-800">{viewStudentsData.schedules.length}</p><p className="text-gray-600">Class schedules</p></div>
                    </div>
                  </div>

                  <section aria-labelledby="section-schedule-title">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-green-700" aria-hidden="true" />
                      <h3 id="section-schedule-title" className="font-semibold text-gray-900">Class Schedule</h3>
                      <span className="view-students-count">{viewStudentsData.schedules.length}</span>
                    </div>
                    <div className="table-container view-students-table-scroll" role="region" aria-label="Class schedule table" tabIndex={0}>
                      <table className="table view-students-table view-students-schedule-table">
                        <caption className="sr-only">Class schedules for {viewStudentsData.sectionHeading}</caption>
                        <thead><tr>
                          <th scope="col">Code</th><th scope="col">Subject</th><th scope="col">Faculty</th><th scope="col">Days</th><th scope="col">Time</th>
                        </tr></thead>
                        <tbody>
                          {viewStudentsData.schedules.length ? viewStudentsData.schedules.map((schedule) => (
                            <tr key={schedule.id}>
                              <td className="whitespace-nowrap"><span className="font-semibold text-green-800">{schedule.subjectCode}</span></td>
                              <td><span className="font-medium text-gray-800">{schedule.subjectName}</span></td>
                              <td>{schedule.facultyName || "?"}</td>
                              <td>{formatScheduleDays(schedule.days)}</td>
                              <td className="whitespace-nowrap tabular-nums">{formatTimeRange(schedule.startTime, schedule.endTime)}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="view-students-empty">No class schedules found for this section.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section aria-labelledby="section-students-title">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-700" aria-hidden="true" />
                        <h3 id="section-students-title" className="font-semibold text-gray-900">Student Roster</h3>
                        <span className="view-students-count">{viewStudentsData.students.length}</span>
                      </div>
                      <p className="text-xs text-gray-500">Sorted by last name</p>
                    </div>
                    <div className="table-container view-students-table-scroll" role="region" aria-label="Student roster table" tabIndex={0}>
                      <table className="table view-students-table view-students-roster-table">
                        <caption className="sr-only">Active students in {viewStudentsData.sectionHeading}</caption>
                        <thead><tr>
                          <th scope="col" className="w-14">#</th><th scope="col">Student ID</th><th scope="col">Student Name</th><th scope="col">Section</th><th scope="col">Status</th>
                        </tr></thead>
                        <tbody>
                          {viewStudentsData.students.length ? viewStudentsData.students.map((student, index) => (
                            <tr key={student.id}>
                              <td className="tabular-nums">{index + 1}</td>
                              <td className="whitespace-nowrap tabular-nums"><span className="font-medium text-gray-700">{student.idNumber || "?"}</span></td>
                              <td><span className="font-semibold text-gray-800">{student.formattedName}</span></td>
                              <td className="whitespace-nowrap">{student.department?.split(' - ')[1] || '?'}</td>
                              <td><span className="view-students-status"><span aria-hidden="true" />{student.status}</span></td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="view-students-empty">No active students found for this section.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">No data available.</p>
              )}
            </div>
        </AcademicModal>
      ) : null}
    </div>
  );
}

function AdminDepartmentPage() {
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
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
      setLoadError("");
      const data = await apiFetch("/departments.php");
      if (Array.isArray(data)) setDepartments(data);
    } catch (err) {
      setLoadError(err.message || "Unable to load departments. Please try again.");
    } finally {
      setLoading(false);
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
    <div className="department-page animate-fade-up space-y-5">
      <HeaderBlock
        title="Department Management"
        description="Manage the department names used across your system."
        rightContent={(
          <button type="button" onClick={() => { setAddModalOpen(true); setNewName(""); }} className="btn btn-secondary w-full justify-center whitespace-nowrap lg:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add Department
          </button>
        )}
      />
      <FeedbackModal
        message={feedback.message}
        tone={feedback.tone}
        onClose={() => setFeedback((prev) => ({ ...prev, message: "" }))}
      />

      <section className="card-elevated" aria-labelledby="department-directory-title">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="department-directory-title" className="text-lg font-semibold text-gray-900">Department Directory</h2>
                <span className="department-count">{departments.length}</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">View and maintain your department records.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <label className="block w-full sm:max-w-sm">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Search departments</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by department name..." className="form-input department-search" />
            </div>
          </label>
          <label className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm text-gray-500">
            Rows per page
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="form-input department-page-size" aria-label="Rows per page">
              <option value="10">10</option><option value="30">30</option><option value="50">50</option>
            </select>
          </label>
        </div>

        {loadError ? (
          <div role="alert" className="mx-5 my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{loadError}</span><button type="button" onClick={fetchDepartments} className="btn btn-secondary text-xs">Retry</button>
          </div>
        ) : null}
        <div className="department-table-scroll" role="region" aria-label="Department directory table" tabIndex={0}>
          <table className="table department-table">
            <caption className="sr-only">Department directory with edit and delete actions</caption>
            <thead><tr>
              <th scope="col" className="w-20">No.</th>
              <th scope="col">Department Name</th>
              <th scope="col" className="department-actions-heading">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="department-empty"><p role="status">Loading departments...</p></td></tr>
              ) : paginated.length > 0 ? paginated.map((dept, idx) => (
                <tr key={dept.id} className={editId === dept.id ? "department-editing" : ""}>
                  <td className="tabular-nums">{(safePage - 1) * Number(pageSize) + idx + 1}</td>
                  <td>
                    {editId === dept.id ? (
                      <input autoFocus aria-label="Edit department name" value={editName} onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(dept); if (e.key === "Escape") cancelEdit(); }}
                        className="form-input w-full" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-green-700">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="font-semibold text-gray-800">{dept.name}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {editId === dept.id ? (
                        <>
                          <button type="button" onClick={() => saveEdit(dept)} className="btn btn-primary text-xs">Save</button>
                          <button type="button" onClick={cancelEdit} className="btn btn-secondary text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(dept)} aria-label={`Edit ${dept.name}`} className="btn btn-secondary text-xs">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(dept)} aria-label={`Delete ${dept.name}`} className="btn btn-danger text-xs">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="department-empty">
                  <Building2 className="mx-auto mb-3 h-8 w-8 text-gray-300" aria-hidden="true" />
                  <p className="font-semibold text-gray-700">{loadError ? "Department directory unavailable" : search.trim() ? "No matching departments" : "No departments yet"}</p>
                  <p className="mt-1 text-sm">{loadError ? "Retry loading the department records." : search.trim() ? "Try a different department name." : "Add a department to start building your directory."}</p>
                  {search.trim() ? <button type="button" onClick={() => setSearch("")} className="btn btn-secondary mt-4 text-xs">Clear search</button> : null}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{filtered.length ? (safePage - 1) * Number(pageSize) + 1 : 0}&ndash;{Math.min(safePage * Number(pageSize), filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> departments
          </p>
          <nav aria-label="Department pagination" className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="btn btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
            <span className="px-1 text-xs text-gray-500">Page {safePage} of {totalPages}</span>
            <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="btn btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50">Next</button>
          </nav>
        </footer>
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
    department: currentUser?.department ?? "",
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
      department: currentUser.department ?? "",
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
      department: form.department,
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
                  <Field label="Department" placeholder="Enter department" value={form.department} onChange={(value) => setForm((prev) => ({ ...prev, department: value }))} />
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
                      <SelectField
                        label="Department"
                        value={facultyEditForm.department}
                        onChange={(value) => setFacultyEditForm((prev) => ({ ...prev, department: value }))}
                        required
                        options={[{ label: "Select department...", value: "" }, ...departments.map((d) => ({ label: d.name, value: d.name }))]}
                      />
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
  const [form, setForm] = React.useState(null);
  const [initialForm, setInitialForm] = React.useState(null);
  const [departmentOptions, setDepartmentOptions] = React.useState([]);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const usesManagedSelfAccount = role === "faculty" || role === "student";

  // Initialize form with current user data and set initial form
  React.useEffect(() => {
    if (!currentUser) {
      setForm(null);
      setInitialForm(null);
      return;
    }
    const initial = {
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
    };
    setForm(initial);
    setInitialForm(initial);
  }, [currentUser, role]);

  // Fetch department options for the dropdown when we have auth data
  React.useEffect(() => {
    if (!currentUser) {
      setDepartmentOptions([]);
      return;
    }
    apiFetch('/departments.php')
      .then(data => {
        if (Array.isArray(data)) {
          const options = data
            .map(d => d.name)
            .filter(Boolean)
            .sort()
            .map(name => ({ value: name, label: name }));
          setDepartmentOptions(options);
        }
      })
      .catch(err => {
        // In case of error, keep empty but log for debugging
        console.warn('Failed to fetch departments:', err);
        setDepartmentOptions([]);
      });
  }, [currentUser]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if there are any changes compared to initial form
    let hasChanges = false;
    if (initialForm) {
      hasChanges = !(form.idNumber === initialForm.idNumber &&
          form.username === initialForm.username &&
          form.firstName === initialForm.firstName &&
          form.middleName === initialForm.middleName &&
          form.lastName === initialForm.lastName &&
          form.email === initialForm.email &&
          form.phone === initialForm.phone &&
          form.department === initialForm.department);
    } else {
      // If initialForm is not set yet, we cannot determine changes, so we allow the submission to proceed.
      hasChanges = true;
    }

    if (!hasChanges) {
      setFeedback({ message: "No changes made", tone: "error" });
      return;
    }

    const error = usesManagedSelfAccount ? validateFacultyOwnAccount(form, users, currentUser) : validateAccount(form);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    try {
      await updateOwnAccount(form);
      // Update initial form after successful update
      setInitialForm(form);
      setFeedback({ message: `${roleLabels[role]} account updated successfully.`, tone: "success" });
    } catch (err) {
      setFeedback({ message: err.message || "Failed to update account.", tone: "error" });
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const error = validateAdminPasswordChange(passwordForm);
    if (error) {
      setFeedback({ message: error, tone: "error" });
      return;
    }
    try {
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
    } catch (err) {
      setFeedback({ message: err.message || "Failed to update password.", tone: "error" });
    }
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

      {form ? (
        <>
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
                {role === "faculty" ? (
                  <SelectField
                    label="Department"
                    value={form.department}
                    onChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
                    options={departmentOptions}
                    placeholder="Select department"
                  />
                ) : (
                  <Field label="Department" placeholder="Enter department" value={form.department} onChange={(value) => setForm((prev) => ({ ...prev, department: value }))} />
                )}
              </div>
              <button type="submit" className="btn btn-primary md:col-span-2 justify-self-start">
                Update Account
              </button>
            </form>
          </FormCard>

          {usesManagedSelfAccount && (
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
          )}
        </>
      ) : (
        <FormCard title="Profile Details">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading account data...</p>
          </div>
        </FormCard>
      )}
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
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Live Time</p>
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

function AcademicModal({ title, subtitle, onClose, children, centered = false }) {
  const closeButtonRef = React.useRef(null);
  const titleId = React.useId();
  React.useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return createPortal(
    <div className={centered ? "modal-overlay academic-confirmation-overlay" : undefined}>
    <div className={clsx("academic-fullscreen-modal", centered && "academic-confirmation-modal")} role="dialog" aria-modal="true" aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key === "Tab") {
          const controls = [...event.currentTarget.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
            .filter((element) => !element.disabled && element.getClientRects().length);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header className="academic-fullscreen-header">
        <div>
          <h2 id={titleId} className="text-xl font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        <button ref={closeButtonRef} type="button" onClick={onClose} className="btn btn-secondary shrink-0" aria-label="Close modal">
          <span className="hidden sm:inline">Close</span><X className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </header>
      <div className="academic-fullscreen-body">{children}</div>
    </div>
    </div>,
    document.body,
  );
}

function AcademicRecordsCard({ title, description, icon: Icon, count, visibleCount, recordLabel, search, onSearch, searchPlaceholder, loading, children }) {
  return (
    <section className="card-elevated">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-5 sm:px-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-gray-900">{title}</h2><span className="academic-count">{count}</span></div>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <label className="block w-full sm:max-w-md">
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Search {recordLabel}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className="form-input academic-search" />
          </div>
        </label>
        {search ? <button type="button" onClick={() => onSearch("")} className="btn btn-secondary shrink-0 text-xs">Clear search</button> : null}
      </div>
      {children}
      <footer className="border-t border-gray-200 px-5 py-4 text-sm text-gray-500 sm:px-6" aria-live="polite">
        {loading ? "Loading records..." : <>Showing <span className="font-medium text-gray-700">{visibleCount}</span> of <span className="font-medium text-gray-700">{count}</span> {recordLabel}</>}
      </footer>
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
