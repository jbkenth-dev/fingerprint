import React from "react";
import { createPortal } from "react-dom";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Activity, Archive, Asterisk, BadgeCheck, BookOpenText, Building2, CalendarDays, CalendarRange, ChevronDown, CircleCheck, CircleX, Clock, CreditCard, EllipsisVertical, Eye, EyeOff, FileBarChart, Fingerprint, Info, LayoutDashboard, LockKeyhole, LogIn, LogOut, Menu, RefreshCw, TriangleAlert, UserCog, UserRound, Users, X } from "lucide-react";
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
          <Route path="reports" element={<RolePanel pageKey="reports" role="admin" />} />
          <Route path="department" element={<AdminDepartmentPage />} />
          <Route path="account" element={<AdminAccountPage />} />
          <Route path="archive" element={<AdminArchivePage />} />
          <Route path="developer-mode/attendance" element={<DeveloperAttendancePage />} />
        </Route>
        <Route path="/faculty" element={<ProtectedLayout allowedRole="faculty" />}>
          <Route index element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="dashboard" element={<FacultyDashboardPage />} />
          <Route path="smart-card" element={<RolePanel pageKey="smartCard" role="faculty" />} />
          <Route path="fingerprint-biometric" element={<RolePanel pageKey="biometric" role="faculty" />} />
          <Route path="attendance" element={<RolePanel pageKey="attendance" role="faculty" />} />
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
        const [todayRes, schedulesRes, ...weekResults] = await Promise.allSettled([
          apiFetch(`/attendance.php?date=${today}&limit=500&offset=0`),
          apiFetch("/class-schedules.php"),
          ...Array.from({ length: 7 }, (_, i) =>
            apiFetch(`/attendance.php?date=${getManilaDate(6 - i)}&limit=500&offset=0`)
          ),
        ]);
        if (cancelled) return;
        if (todayRes.status === "fulfilled" && todayRes.value?.records) setTodayLogs(todayRes.value.records);
        if (schedulesRes.status === "fulfilled" && Array.isArray(schedulesRes.value)) setScheduleRows(schedulesRes.value);
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

  /* ── Derived metrics (students only) ── */
  const activeStudents = React.useMemo(() => users.filter((u) => u.role === "student" && u.status === "Active"), [users]);
  const totalUsers = React.useMemo(() => users.length, [users]);
  const totalFaculty = React.useMemo(() => users.filter((u) => u.role === "faculty").length, [users]);
  const totalStudents = React.useMemo(() => users.filter((u) => u.role === "student").length, [users]);
  const smartCardUsers = React.useMemo(() => users.filter((u) => u.smartCardId && u.status !== "Archived"), [users]);
  const fingerprintUsers = React.useMemo(() => users.filter((u) => u.fingerprintId && u.status !== "Archived"), [users]);

  const todayStudentLogs = React.useMemo(
    () => todayLogs.filter((r) => activeStudents.some((s) => s.id === r.userId)),
    [todayLogs, activeStudents],
  );

  const userFirstIn = React.useMemo(() => {
    const map = new Map();
    for (const r of todayStudentLogs) {
      if (r.status === "IN" && !map.has(r.userId)) map.set(r.userId, r);
    }
    return map;
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
            presentList.push({ name: fullName, department: dept, time: userFirstIn.get(student.id)?.logTime, ...subjectInfo });
          } else if (inMin > graceEnd && inMin <= lateEnd) {
            late++;
            lateIds.add(student.id);
            lateList.push({ name: fullName, department: dept, time: userFirstIn.get(student.id)?.logTime, ...subjectInfo });
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
    return result.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
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
    return result.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
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
    csvRows.push(["=== ATTENDANCE BY SUBJECT ==="]);
    csvRows.push(["Subject", "Section", "Time", "Faculty", "Total", "Present", "Late", "Absent"]);
    subjectStats.forEach((s) => csvRows.push([
      `${s.subjectCode} - ${s.subjectName}`,
      `${s.yearLevel} (${s.section})`,
      `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
      s.facultyName, s.total, s.present, s.late, s.absent,
    ]));
    csvRows.push([]);
    csvRows.push(["=== PRESENT USERS ==="]);
    csvRows.push(["Name", "Department", "Time In"]);
    presentUsers.forEach((u) => csvRows.push([u.name, u.department, formatTime(u.logTime)]));
    csvRows.push([]);
    csvRows.push(["=== LATE USERS ==="]);
    csvRows.push(["Name", "Department", "Time In"]);
    lateUsers.forEach((u) => csvRows.push([u.name, u.department, formatTime(u.logTime)]));
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
                            {row.presentList.length ? row.presentList.map((s, i) => (
                              <div key={i} className="text-xs text-gray-700 py-0.5">{s.name} <span className="text-gray-400">— {formatTime(s.time)}</span></div>
                            )) : <div className="text-xs text-gray-400">None</div>}
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">Late ({row.lateList.length})</div>
                            {row.lateList.length ? row.lateList.map((s, i) => (
                              <div key={i} className="text-xs text-gray-700 py-0.5">{s.name} <span className="text-gray-400">— {formatTime(s.time)}</span></div>
                            )) : <div className="text-xs text-gray-400">None</div>}
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
                    {section.title !== "Absent Students" && <th className="px-3 py-2 font-medium">Time IN</th>}
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
                        <td className="px-3 py-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[0.65rem] font-medium text-green-700">{formatTime(u.time)}</span></td>
                      )}
                      <td className="px-3 py-2 text-gray-600">{u.subjectCode ? `${u.subjectCode} — ${u.subjectName}` : "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{u.startTime && u.endTime ? `${formatTime(u.startTime)} – ${formatTime(u.endTime)}` : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={section.title !== "Absent Students" ? 6 : 5} className="px-3 py-6 text-center text-gray-400">{section.empty}</td></tr>
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
  const pageSize = 10;

// Schedule and user data for class info
  const { users } = useAuth();
  const [scheduleRows, setScheduleRows] = React.useState([]);
  const [scheduleLoading, setScheduleLoading] = React.useState(true);
  const [scheduleError, setScheduleError] = React.useState("");

  // Helper functions
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const s = timeStr.trim();
    let meridian = null;
    let cleaned = s;
    if (s.toUpperCase().endsWith('AM')) {
      meridian = 'AM';
      cleaned = s.slice(0, -2).trim();
    } else if (s.toUpperCase().endsWith('PM')) {
      meridian = 'PM';
      cleaned = s.slice(0, -2).trim();
    }
    const parts = cleaned.split(':');
    if (parts.length < 2) return null;
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const formatTime = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}/.test(timeStr)) return "—";
    const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const parseStudentDept = (dept) => {
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
  };

  const getManilaDayFromDate = (dateStr) => {
    const dayNameMap = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const d = new Date(dateStr);
    return dayNameMap[d.getDay()] || "";
  };

  // Fetch schedule data
  React.useEffect(() => {
    const loadSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError("");
      try {
        const data = await apiFetch("/class-schedules.php");
        setScheduleRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setScheduleError(err.message || "Failed to load schedule.");
      } finally {
        setScheduleLoading(false);
      }
    };
    loadSchedule();
  }, []);

// Admin attendance page state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateRangeFilter, setDateRangeFilter] = React.useState('today'); // today, week, month, custom
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [viewMode, setViewMode] = React.useState('all'); // all, live, students, late, absent, history, duplicates
  const [liveUpdateInterval, setLiveUpdateInterval] = React.useState(null);
  const [duplicateRecords, setDuplicateRecords] = React.useState([]);

  const fetchAttendanceLogs = React.useCallback(async (date, page, filters = {}) => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const params = new URLSearchParams();
      // Only send date param for live mode or history view (single-day fetches)
      if (viewMode === 'live' || viewMode === 'history') {
        if (date) {
          params.set("date", date);
        }
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
  }, [viewMode]);

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

  function minutesToTimeString(minutes) {
    if (minutes === null) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(mins).padStart(2, "0")} ${suffix}`;
  }

  function attendanceMethod(source) {
    return source === "esp32" || source === "esp32-sync" ? "Fingerprint + Card" : source;
  }

  // Check if this is the admin attendance page
  const isAdminAttendancePage = !isDashboard && pageKey === "attendance" && role === "admin";

  // Filtered attendance based on search and filters (only for admin attendance page)
  const filteredAttendance = React.useMemo(() => {
    if (!isAdminAttendancePage) return attendanceLogs;

    return attendanceLogs.filter(record => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = record.name?.toLowerCase().includes(searchLower) ||
          record.idNumber?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      
      // Apply date range filter only in All Records view
      let includeRecord = true;
      if (viewMode === 'all') {
        const recordDate = new Date(record.logDate);
        const today = new Date();
        switch (dateRangeFilter) {
          case 'today':
            includeRecord = recordDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + (6 - today.getDay()));
            weekEnd.setHours(23, 59, 59, 999);
            includeRecord = recordDate >= weekStart && recordDate <= weekEnd;
            break;
          case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            includeRecord = recordDate >= monthStart && recordDate <= monthEnd;
            break;
          case 'custom':
            if (customStartDate && customEndDate) {
              const startDate = new Date(customStartDate);
              const endDate = new Date(customEndDate);
              includeRecord = recordDate >= startDate && recordDate <= endDate;
            }
            break;
          default:
            includeRecord = recordDate.toDateString() === today.toDateString();
        }
      }

      return includeRecord;
    });
  }, [attendanceLogs, searchTerm, dateRangeFilter, customStartDate, customEndDate]);

  // Today's statistics (for cards - only for admin attendance page)
  const today = new Date();
  const todayString = today.toDateString();
  const todayRecords = isAdminAttendancePage ? attendanceLogs.filter(record =>
    new Date(record.logDate).toDateString() === todayString
  ) : [];

  const todayPresentCount = isAdminAttendancePage ? todayRecords.filter(record => record.status === 'IN').length : 0;
  const todayAbsentCount = isAdminAttendancePage ? todayRecords.filter(record => record.status === 'OUT').length : 0;

  // Calculate late arrivals (requires schedule data which we don't have in this context)
  // For now, we'll approximate late as IN records after 9:00 AM
  const todayLateCount = isAdminAttendancePage ? todayRecords.filter(record => {
    const timeIn = record.logTime;
    if (!timeIn) return false;
    const [hours, minutes] = timeIn.split(':').map(Number);
    return hours > 9 || (hours === 9 && minutes > 0);
  }).length : 0;

  const mergedAttendance = React.useMemo(() => {
    // Group filteredAttendance by userId and logDate
    const groups = new Map();
    filteredAttendance.forEach(record => {
      const key = `${record.userId}-${record.logDate}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          userId: record.userId,
          logDate: record.logDate,
          records: [],
          name: record.name,
          idNumber: record.idNumber || record.username || 'N/A'
        };
        groups.set(key, group);
      }
      group.records.push(record);
    });

    const result = [];

    for (const group of groups.values()) {
      const { userId, logDate, name, idNumber, records } = group;

      // Sort records by logTime ascending
      const sortedRecords = [...records].sort((a, b) => {
        const timeA = a.logTime ? timeToMinutes(a.logTime) : -1;
        const timeB = b.logTime ? timeToMinutes(b.logTime) : -1;
        return timeA - timeB;
      });

      // Pair IN and OUT chronologically: each IN pairs with the next OUT after it.
      const pendingIn = []; // store {time:string}
      for (const rec of sortedRecords) {
        if (rec.status === "IN") {
          pendingIn.push({time: rec.logTime});
        } else if (rec.status === "OUT") {
          if (pendingIn.length > 0) {
            // Pair earliest pending IN with this OUT
            const inObj = pendingIn.shift();
            const timeIn = inObj.time;
            const timeOut = rec.logTime;

            // Create a session entry
            const inMin = timeToMinutes(timeIn);
            const outMin = timeToMinutes(timeOut);
            const entry = {
              userId,
              logDate,
              name,
              idNumber,
              classes: "-",
              timeSchedule: "-",
              timeIn: inMin !== null ? minutesToTimeString(inMin) : "",
              timeOut: outMin !== null ? minutesToTimeString(outMin) : "",
              status: "Invalid",
              reason: "No Time Scheduled",
              rawInTime: inMin // keep raw for validation (minutes)
            };

            // If this is the admin attendance page, compute classes, timeSchedule, status, reason
            if (isAdminAttendancePage && timeIn) {
              const user = users.find(u => u.id === userId);
              if (user) {
                const parsed = parseStudentDept(user.department);
                if (parsed) {
                  const dayName = getManilaDayFromDate(logDate);
                  const schedule = scheduleRows.find(
                    s => s.yearLevel === parsed.yearLevel &&
                         s.section === parsed.section &&
                         Array.isArray(s.days) &&
                         s.days.includes(dayName)
                  );
                  if (schedule) {
                    entry.classes = `${schedule.subjectCode} — ${schedule.subjectName}`;
                    entry.timeSchedule = `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`;
                    // Determine validity based on IN time
                    const inMin = timeToMinutes(timeIn);
                    const startMin = timeToMinutes(schedule.startTime);
                    const endMin = timeToMinutes(schedule.endTime);
                    if (startMin !== null && endMin !== null && inMin !== null) {
                      const windowStart = startMin - 15;
                      const windowEnd = endMin - 15;
                      if (inMin >= windowStart && inMin <= windowEnd) {
                        entry.status = "Valid";
                        entry.reason = "Time Scheduled";
                      } else {
                        entry.status = "Invalid";
                        entry.reason = "No Time Scheduled";
                        entry.classes = "-";
                        entry.timeSchedule = "-";
                      }
                    }
                  }
                }
              }
            }

            result.push(entry);
          } else {
            // Unpaired OUT (no preceding IN)
            const outMin = timeToMinutes(rec.logTime);
            const entry = {
              userId,
              logDate,
              name,
              idNumber,
              classes: "-",
              timeSchedule: "-",
              timeIn: "",
              timeOut: outMin !== null ? minutesToTimeString(outMin) : "",
              status: "Invalid",
              reason: "No Time Scheduled",
              rawInTime: null
            };
            result.push(entry);
          }
        }
      }

      // Any remaining INs without a matching OUT
      while (pendingIn.length > 0) {
        const inObj = pendingIn.shift();
        const timeIn = inObj.time;

        const inMin = timeToMinutes(timeIn);
        const entry = {
          userId,
          logDate,
          name,
          idNumber,
          classes: "-",
          timeSchedule: "-",
          timeIn: inMin !== null ? minutesToTimeString(inMin) : "",
          timeOut: "",
          status: "Invalid",
          reason: "No Time Scheduled",
          rawInTime: inMin // keep raw for validation (minutes)
        };

        // If this is the admin attendance page, compute classes, timeSchedule, status, reason
        if (isAdminAttendancePage && timeIn) {
          const user = users.find(u => u.id === userId);
          if (user) {
            const parsed = parseStudentDept(user.department);
            if (parsed) {
              const dayName = getManilaDayFromDate(logDate);
              const schedule = scheduleRows.find(
                s => s.yearLevel === parsed.yearLevel &&
                     s.section === parsed.section &&
                     Array.isArray(s.days) &&
                     s.days.includes(dayName)
              );
              if (schedule) {
                entry.classes = `${schedule.subjectCode} — ${schedule.subjectName}`;
                entry.timeSchedule = `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`;
                // Determine validity based on IN time
                const inMin = timeToMinutes(timeIn);
                const startMin = timeToMinutes(schedule.startTime);
                const endMin = timeToMinutes(schedule.endTime);
                if (startMin !== null && endMin !== null && inMin !== null) {
                  const windowStart = startMin - 15;
                  const windowEnd = endMin - 15;
                  if (inMin >= windowStart && inMin <= windowEnd) {
                    entry.status = "Valid";
                    entry.reason = "Time Scheduled";
                  } else {
                    entry.status = "Invalid";
                    entry.reason = "No Time Scheduled";
                    entry.classes = "-";
                    entry.timeSchedule = "-";
                  }
                }
              }
            }
          }
        }

        result.push(entry);
      }
    }

    return result;
  }, [filteredAttendance, users, scheduleRows, isAdminAttendancePage]);

  const totalAttendancePages = Math.max(1, Math.ceil(mergedAttendance.length / pageSize));

  // Duplicate detection (only for admin attendance page)
  const detectDuplicates = React.useCallback(() => {
    if (!isAdminAttendancePage) return [];

    const duplicates = [];
    const seen = new Map();

    attendanceLogs.forEach(record => {
      const key = `${record.userId}-${record.logDate}`;
      if (seen.has(key)) {
        // This is a duplicate
        const existingRecord = seen.get(key);
        duplicates.push({
          id: record.id,
          userId: record.userId,
          name: record.name,
          logDate: record.logDate,
          logTime: record.logTime,
          status: record.status,
          type: 'Same User & Date'
        });
        // Also mark the original as duplicate if not already marked
        if (!seen.get(key).isMarkedDuplicate) {
          duplicates.push({
            id: existingRecord.id,
            userId: existingRecord.userId,
            name: existingRecord.name,
            logDate: existingRecord.logDate,
            logTime: existingRecord.logTime,
            status: existingRecord.status,
            type: 'Same User & Date'
          });
          seen.get(key).isMarkedDuplicate = true;
        }
      } else {
        seen.set(key, { ...record, isMarkedDuplicate: false });
      }
    });

    return duplicates;
  }, [attendanceLogs, isAdminAttendancePage]);

  // Update duplicate records when attendance logs change
  React.useEffect(() => {
    if (isAdminAttendancePage) {
      setDuplicateRecords(detectDuplicates());
    }
  }, [attendanceLogs, detectDuplicates, isAdminAttendancePage]);

  // Fetch attendance logs for admin attendance page when filters change or viewMode changes (except for live mode)
  React.useEffect(() => {
    if (!isAdminAttendancePage) return;

    // Live mode is handled by the live effect, so skip here.
    if (viewMode === 'live') {
      return;
    }

    setAttendancePage(1);

    if (viewMode === 'history') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      fetchAttendanceLogs(yesterdayString, 1, {});
    } else if (viewMode === 'duplicates') {
      // Fetch without date to get all records
      fetchAttendanceLogs(null, 1, {});
    } else {
      // Default: use the current filters (searchTerm, dateRangeFilter, etc.)
      fetchAttendanceLogs(null, 1, {});
    }
  }, [isAdminAttendancePage, viewMode, searchTerm, dateRangeFilter, customStartDate, customEndDate, fetchAttendanceLogs]);

  // Live attendance updates (polling every 10 seconds - only for admin attendance page)
  React.useEffect(() => {
    if (!isAdminAttendancePage || viewMode !== 'live') {
      // If not in live mode, clean up and return
      if (liveUpdateInterval !== null) {
        clearInterval(liveUpdateInterval);
        setLiveUpdateInterval(null);
      }
      return;
    }

    // We are in live mode

    // Clear any existing interval
    if (liveUpdateInterval !== null) {
      clearInterval(liveUpdateInterval);
    }

    // Fetch initial data for today
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    fetchAttendanceLogs(todayString, 1, {});

    // Set up interval to fetch every 10 seconds
    const interval = setInterval(() => {
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0];
      fetchAttendanceLogs(currentDateString, 1, {}); // Page 1 for latest records
    }, 10000);

    setLiveUpdateInterval(interval);

    // Cleanup
    return () => {
      if (liveUpdateInterval !== null) {
        clearInterval(liveUpdateInterval);
      }
    };
  }, [isAdminAttendancePage, viewMode, fetchAttendanceLogs]);

  // Export function (only for admin attendance page)
  const handleExportAttendance = React.useCallback(() => {
    if (!isAdminAttendancePage || mergedAttendance.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare CSV data
    const csvRows = [];

    // Header
    csvRows.push(['Francis Key Attendance Export']);
    csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
    csvRows.push([]);

    // Filters applied
    csvRows.push(['Applied Filters:']);
    csvRows.push([`Search: ${searchTerm || 'None'}`]);
    csvRows.push([`Date Range: ${dateRangeFilter === 'custom' && customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : dateRangeFilter}`]);
    csvRows.push([]);

    // Data header
    csvRows.push(['No.', 'Name', 'ID Number', 'Classes', 'Time Schedule', 'Date', 'Time IN', 'Time OUT', 'Status', 'Reason']);

    // Data rows
    mergedAttendance.forEach((entry, index) => {
      csvRows.push([
        index + 1,
        entry.name,
        entry.idNumber,
        entry.classes,
        entry.timeSchedule,
        entry.logDate,
        entry.timeIn,
        entry.timeOut,
        entry.status,
        entry.reason
      ]);
    });

    // Generate CSV
    const csvContent = csvRows.map(row =>
      row.map(field =>
        `"${String(field).replace(/"/g, '""')}"`
      ).join(',')
    ).join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `francis-key-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mergedAttendance, searchTerm, dateRangeFilter, customStartDate, customEndDate, isAdminAttendancePage]);
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
        <>
          {/* Admin Attendance Management Page */}
        <section className="space-y-6">
          {/* Header with title and export button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                          </div>
            <button
              onClick={handleExportAttendance}
              className="btn btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <FileBarChart size={16} />
              Export
            </button>
          </div>
          {/* Controls Section */}
          <section className="space-y-4">
            {/* View Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[{
                label: "All Records",
                value: "all"
              }, {
                label: "Live Attendance",
                value: "live"
              }, {
                label: "Late Arrivals",
                value: "late"
              }, {
                label: "Absent Today",
                value: "absent"
              }, {
                label: "Attendance History",
                value: "history"
              }, {
                label: "Duplicates",
                value: "duplicates"
              }].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setViewMode(tab.value)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium
                    ${viewMode === tab.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="flex flex-col">
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                  Search Records
                </label>
                <input
                  type="text"
                  placeholder="Search name or ID Number"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setAttendancePage(1); // Reset to first page when searching
                  }}
                  className="form-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>

              
              
              {/* Date Range Filter - Only show in All Records view */}
              {viewMode === 'all' && (
                <div className="flex flex-col">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                    Date Range
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => {
                      setDateRangeFilter(e.target.value);
                      if (e.target.value === 'custom') {
                        // Set default custom range to last 7 days
                        const end = new Date();
                        const start = new Date(end);
                        start.setDate(start.getDate() - 7);
                        setCustomStartDate(start.toISOString().split('T')[0]);
                        setCustomEndDate(end.toISOString().split('T')[0]);
                      } else if (e.target.value !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                      setAttendancePage(1);
                    }}
                    className="form-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              )}

              {/* Custom Date Range (visible when custom is selected) */}
              {dateRangeFilter === 'custom' && (
                <>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="form-input w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="form-input w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Attendance Records Table */}
          <section className="space-y-4">
            {viewMode === 'live' && (
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Live Attendance Feed</h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    ● Live Updates Active
                  </span>
                </div>
              </div>
            )}
            {viewMode !== 'live' && (
              <h2 className="text-lg font-semibold text-gray-800">Attendance Records</h2>
            )}

            {/* Table Container */}
            <div className="mt-4">
              {attendanceError ? (
                <div className="alert alert-error">
                  <p className="font-semibold">Failed to load attendance records</p>
                  <p className="mt-1 text-xs opacity-80">{attendanceError}</p>
                </div>
              ) : attendanceLoading ? (
                <div className="text-center py-8">
                  Loading attendance records...
                </div>
              ) : mergedAttendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found matching the current filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table min-w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            #
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Name
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            ID Number
                          </th>
                          {viewMode !== 'absent' && (
                            <>
                              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                                Classes
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                                Time Schedule
                              </th>
                            </>
                          )}
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Time IN
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Time OUT
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                            Reason
                          </th>
                          {viewMode === 'duplicates' && (
                            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                              Duplicate Type
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {mergedAttendance.map((entry, index) => {
                          const isDuplicate = duplicateRecords.some(dup =>
                            dup.userId === entry.userId && dup.logDate === entry.logDate
                          );

                          return (
                            <tr
                              key={`${entry.userId}-${entry.logDate}`}
                              className={`border-b border-gray-50 ${isDuplicate ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-4 py-3 text-xs text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3 font-medium text-gray-800">{entry.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.idNumber}
                              </td>
                              {viewMode !== 'absent' && (
                                <>
                                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                    {entry.classes}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {entry.timeSchedule}
                                  </td>
                                </>
                              )}
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.logDate}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.timeIn}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.timeOut}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                  ${entry.status === 'Valid' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}
                                >
                                  {entry.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {entry.reason}
                              </td>
                              {viewMode === 'duplicates' && (
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {isDuplicate ? (
                                    <span className="text-xs font-medium text-red-600">
                                      Same User & Date
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">
                                      -
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {(attendancePage - 1) * pageSize + 1}-{Math.min(attendancePage * pageSize, mergedAttendance.length)} of {mergedAttendance.length} records
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAttendancePage(Math.max(1, attendancePage - 1))}
                        disabled={attendancePage === 1}
                        className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setAttendancePage(Math.min(totalAttendancePages, attendancePage + 1))}
                        disabled={attendancePage === totalAttendancePages || totalAttendancePages === 0}
                        className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </section>
        </>
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
  const { users } = useAuth();
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
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="w-[1%] px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                      Loading class schedules...
                    </td>
                  </tr>
                ) : groupedScheduleRows.length ? (
                  groupedScheduleRows.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="table-section-row">
                        <td colSpan="6" className="px-4 py-2">
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
                                onClick={() => handleViewStudents(group)}
                                className="btn btn-secondary text-xs text-blue-700 border-blue-200 bg-blue-50"
                              >
                                View Students
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
                          <td className="px-4 py-3">{row.facultyName || "—"}</td>
                          <td className="px-4 py-3">{formatScheduleDays(row.days)}</td>
                          <td className="px-4 py-3">{formatTimeRange(row.startTime, row.endTime)}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
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
      {isViewStudentsModalOpen ? (
        <div className="modal-overlay">
          <div className="my-auto w-full max-w-4xl">
            <FormCard className="border-l-4 border-green-500 bg-white shadow-lg rounded-lg">
              <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  View Students
                </h2>
                <button
                  type="button"
                  onClick={() => setIsViewStudentsModalOpen(false)}
                  className="btn btn-secondary hover:bg-gray-100 transition-colors"
                >
                  Close
                  <X className="ml-2 h-4 w-4" />
                </button>
              </div>

              {viewStudentsLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : viewStudentsError ? (
                <div className="alert alert-error">{viewStudentsError}</div>
              ) : viewStudentsData ? (
                <>
                  <div className="mb-4">
                    <p className="font-semibold">
                      Section {viewStudentsData.schedules[0]?.yearLevel.charAt(0)}-{viewStudentsData.schedules[0]?.section}
                    </p>
                  </div>

                  {/* Class Schedule Table */}
                  <div className="mb-6">
                    <p className="font-semibold mb-2">Class Schedule</p>
                    {viewStudentsData.schedules.length > 0 ? (
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Faculty</th>
                            <th className="px-4 py-3">Days</th>
                            <th className="px-4 py-3">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewStudentsData.schedules.map((schedule) => (
                            <tr key={schedule.id}>
                              <td className="px-4 py-3 font-semibold text-gray-800">{schedule.subjectCode}</td>
                              <td className="px-4 py-3">{schedule.subjectName}</td>
                              <td className="px-4 py-3">{schedule.facultyName || "—"}</td>
                              <td className="px-4 py-3">{formatScheduleDays(schedule.days)}</td>
                              <td className="px-4 py-3">{formatTimeRange(schedule.startTime, schedule.endTime)}</td>
                            </tr>
                          ))}
                      </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-500">No class schedules found for this section.</p>
                    )}
                  </div>

                  {/* Students Table */}
                  <div className="">
                    <p className="font-semibold mb-2">Students</p>
                    {viewStudentsData.students.length > 0 ? (
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-4 py-3">Student ID</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Section</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewStudentsData.students.map((student) => (
                            <tr key={student.id}>
                              <td className="px-4 py-3">{student.idNumber}</td>
                              <td className="px-4 py-3 font-medium text-gray-800">{student.formattedName}</td>
                              <td className="px-4 py-3">{student.department?.split(' - ')[1] || '—'}</td>
                              <td className="px-4 py-3">{student.status}</td>
                            </tr>
                          ))}
                      </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-500">No active students found for this section.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No data available.</p>
              )}
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
