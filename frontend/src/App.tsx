import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Activity, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck, Code2, Compass, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search, Send, Settings, ShieldAlert, Sparkles, Target, Users, X } from "lucide-react";
import { type Skill, type SkillGapItem } from "@dhyavora/contracts";
import { api } from "./api";
import { useAuth } from "./auth";
import { SkillPill } from "./ui";
import { CareerIntelligence } from "./CareerIntelligence";

type Row = { _id: string; title: string; data: Record<string, any>; createdAt?: string; updatedAt?: string; author?: string };
type Career = Row;

type NavItem = readonly [string, string, typeof LayoutDashboard];
const navSections: { title: string; items: NavItem[] }[] = [
  { title: "Workspace", items: [
    ["/", "Today", LayoutDashboard], ["/career", "Career path", Compass], ["/assessments", "Assessments", ClipboardCheck], ["/interviews", "AI interview", MessageCircle], ["/projects", "Projects", Code2], ["/learning", "Learning", GraduationCap],
  ] },
  { title: "Career tools", items: [
    ["/resume", "Resume studio", FileText], ["/opportunities", "Opportunities", BriefcaseBusiness], ["/applications", "Applications", Target], ["/analytics", "Analytics", Activity], ["/mentorship", "Mentorship", Users], ["/community", "Community", MessageCircle],
  ] },
  { title: "Personal", items: [["/copilot", "Career copilot", Sparkles], ["/profile", "My profile", Activity], ["/settings", "Settings", Settings]] },
];

function useRecords(kind: string) {
  return useQuery({ queryKey: ["records", kind], queryFn: () => api.get<Row[]>(`/resources/${kind}`), retry: false });
}
function useProfile() {
  return useRecords("profile");
}
function readProfile(records: Row[] | undefined) { return records?.[0]; }

export function App() {
  const { user, loading, configured } = useAuth();
  if (loading) return <div className="boot-screen"><span className="brand-glyph">✦</span><span>Preparing your workspace</span></div>;
  if (!configured) return <LoginScreen setupRequired />;
  if (!user) return <LoginScreen />;
  if (!user.emailVerified) return <VerifyEmailScreen />;
  return <Workspace />;
}

function authMessage(reason: unknown) {
  const code = reason instanceof Error ? reason.message : String(reason ?? "");
  if (/auth\/invalid-credential|auth\/invalid-login-credentials/i.test(code)) return "Email or password is incorrect.";
  if (/auth\/user-not-found/i.test(code)) return "We couldn’t find an account with that email.";
  if (/auth\/wrong-password/i.test(code)) return "Email or password is incorrect.";
  if (/auth\/email-already-in-use/i.test(code)) return "An account already exists with that email. Try signing in.";
  if (/auth\/weak-password/i.test(code)) return "Choose a stronger password with at least 6 characters.";
  if (/auth\/invalid-email/i.test(code)) return "Enter a valid email address.";
  if (/auth\/too-many-requests/i.test(code)) return "Too many attempts. Please wait a little and try again.";
  if (/auth\/network-request-failed/i.test(code)) return "We couldn’t reach the service. Check your connection and try again.";
  if (/Firebase|credential|configuration|provider/i.test(code)) return "Sign-in is temporarily unavailable. Please try again shortly.";
  return code || "Authentication could not complete. Please try again.";
}

function LoginScreen({ setupRequired = false }: { setupRequired?: boolean }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setSuccess("Password reset instructions are on their way. Check your inbox.");
        setMode("login");
      } else {
        await (mode === "login" ? signIn(email, password) : signUp(email, password));
        if (mode === "signup") setSuccess("Account created. Check your email to verify your address before continuing.");
      }
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const isReset = mode === "reset";
  return <main className="auth-page">
    <section className="auth-story">
      <Brand compact={false} />
      <div className="story-copy">
        <div className="eyebrow"><span className="spark-dot" /> YOUR NEXT CHAPTER, IN FOCUS</div>
        <h1>Make your ambition<br />feel <span>actionable.</span></h1>
        <p>A calmer, clearer way to build the skills, proof and confidence for the work you want.</p>
        <div className="story-points">
          <div><strong>Career map</strong><span>See the skills and milestones behind your target role.</span></div>
          <div><strong>Practice that matters</strong><span>Assess yourself with role, skill and difficulty-aware simulations.</span></div>
          <div><strong>Evidence over hype</strong><span>Turn projects, learning and progress into a clearer career story.</span></div>
        </div>
        <div className="story-foot"><div className="orbit-mark"><span>✦</span></div><span>One thoughtful step<br />at a time.</span></div>
      </div>
      <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    </section>

    <section className="auth-panel"><div className="auth-form-wrap">
      <div className="mobile-brand"><Brand /></div>
      <div className="eyebrow muted">YOUR CAREER WORKSPACE</div>
      <h2>{setupRequired ? "Sign-in is unavailable." : isReset ? "Reset your password." : mode === "login" ? "Welcome back." : "Start with a clear path."}</h2>
      <p className="muted-copy">{setupRequired ? "Sign-in is temporarily unavailable. Please try again shortly." : isReset ? "Enter your email and we’ll send password reset instructions." : mode === "login" ? "Sign in to pick up where your growth left off." : "Create your Dhyavora account and begin with your goals."}</p>

      {setupRequired ? <div className="setup-note"><ShieldAlert size={18} /><div><strong>Come back soon</strong><span>Sign-in is not available right now. Please try again shortly.</span></div></div> : <>
        <form onSubmit={submit} className="stack-form">
          <label>Email address<input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          {!isReset && <label>Password<input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required /></label>}
          {error && <div className="inline-error">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          <button className="button button-primary wide" disabled={busy}>{busy ? "Please wait…" : isReset ? "Send reset instructions" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button>
        </form>

        <div className="auth-links">
          {mode === "login" && <button onClick={() => { setMode("reset"); setError(""); setSuccess(""); }}>Forgot password?</button>}
          {mode === "reset" && <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>Back to sign in</button>}
          {mode !== "reset" && <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}>{mode === "login" ? "Create account" : "Already have an account? Sign in"}</button>}
        </div>
      </>}

      <p className="privacy-note"><ShieldAlert size={13} /> Your career data stays yours. We verify your sign-in securely and keep your workspace private.</p>
    </div></section>
  </main>;
}

function VerifyEmailScreen() {
  const { user, resendVerification, refreshUser, logOut } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true); setError(""); setMessage("");
    try {
      await resendVerification();
      setMessage("Verification email sent. Check your inbox, then return here.");
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function checkVerification() {
    setBusy(true); setError(""); setMessage("");
    try {
      await refreshUser();
      if (user?.emailVerified === false) setMessage("Your email is still waiting for verification. Open the latest verification email and try again.");
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-story">
      <Brand compact={false} />
      <div className="story-copy"><div className="eyebrow"><span className="spark-dot" /> ONE LAST STEP</div><h1>Verify your<br /><span>email.</span></h1><p>We use a verified email to keep your Dhyavora workspace secure.</p><div className="story-foot"><div className="orbit-mark"><span>✦</span></div><span>{user?.email ?? "Your email"}<br />needs confirmation.</span></div></div>
      <div className="auth-orb orb-one" /><div className="auth-orb orb-two" />
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <div className="mobile-brand"><Brand /></div><div className="eyebrow muted">CHECK YOUR INBOX</div><h2>Confirm your email.</h2><p className="muted-copy">Open the verification email we sent, then come back and continue to your workspace.</p>
      {message && <div className="success-banner">{message}</div>}{error && <div className="inline-error">{error}</div>}
      <div className="auth-actions-stack"><button className="button button-primary wide" disabled={busy} onClick={checkVerification}>{busy ? "Checking…" : "I’ve verified my email"}<ArrowRight size={16} /></button><button className="button button-soft wide" disabled={busy} onClick={resend}>Resend verification email</button><button className="auth-secondary" onClick={() => logOut()}>Use a different account</button></div>
      <p className="privacy-note"><ShieldAlert size={13} /> Your account stays private while verification is pending.</p>
    </div></section>
  </main>;
}

function Brand({ compact = true }: { compact?: boolean }) { return <Link to="/" className={`brand ${compact ? "" : "brand-large"}`} aria-label="Dhyavora home"><img className="brand-image" src="/dhyavora-logo.png" alt="Dhyavora" /></Link>; }

function Workspace() {
  const { user, logOut } = useAuth(); const [sidebarOpen, setSidebarOpen] = useState(false); const profile = useProfile(); const queryClient = useQueryClient();
  const name = readProfile(profile.data)?.data?.displayName || user?.displayName || user?.email?.split("@")[0] || "there";
  const location = useLocation();
  useEffect(() => setSidebarOpen(false), [location.pathname]);
  async function logout() { await logOut(); await queryClient.clear(); }
  return <div className="workspace">
    <AnimatePresence>{sidebarOpen && <motion.div className="mobile-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />}</AnimatePresence>
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand /><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-pill"><span className="workspace-avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>Personal workspace</small></span><ChevronDown size={14} /></div>
      <nav className="sidebar-nav">{navSections.map((section) => <div key={section.title} className="nav-section"><div className="nav-label">{section.title}</div>{section.items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Career copilot" && <span className="nav-new">AI</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>A thoughtful pace</strong><p>Your path can change as you do.</p></div></div><button className="nav-link logout-link" onClick={logout}><LogOut size={17} /><span>Sign out</span></button><div className="sidebar-version">DHYAVORA <span>•</span> PRIVATE BETA</div></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><strong>{navSections.flatMap((section) => section.items).find(([to]) => to === location.pathname)?.[1] ?? "Today"}</strong></div><div className="topbar-actions"><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><button className="top-avatar" title={user?.email ?? "Account"}>{name.slice(0, 1).toUpperCase()}</button></div></header>
      <div className="page-frame"><Routes><Route path="/" element={<DashboardPage name={name} />} /><Route path="/career" element={<CareerIntelligence view="overview" />} /><Route path="/career/explore" element={<CareerIntelligence view="explore" />} /><Route path="/career/skill-gap" element={<CareerIntelligence view="skill-gap" />} /><Route path="/career/roadmap" element={<CareerIntelligence view="roadmap" />} /><Route path="/career/progress" element={<CareerIntelligence view="progress" />} /><Route path="/career/readiness" element={<CareerIntelligence view="readiness" />} /><Route path="/career/:careerId" element={<CareerIntelligence view="detail" />} /><Route path="/assessments" element={<AssessmentPage />} /><Route path="/interviews" element={<InterviewPage />} /><Route path="/projects" element={<ResourcePage kind="project" title="Projects" kicker="SHOW YOUR WORK" description="Turn what you learn into evidence you can point to." fields={[["description", "What are you building?"], ["skills", "Skills (comma separated)"], ["technologies", "Technologies"], ["repositoryUrl", "Repository URL"], ["liveUrl", "Live project URL"]]} />} /><Route path="/learning" element={<LearningPage />} /><Route path="/resume" element={<ResumePage />} /><Route path="/opportunities" element={<ResourcePage kind="opportunity" title="Opportunities" kicker="FIND YOUR OPENING" description="Save the opportunities you discover and keep the source attached." fields={[["organization", "Organization"], ["sourceUrl", "Original listing URL"], ["category", "Type (internship, job, scholarship…)"], ["deadline", "Deadline (optional)"]]} />} /><Route path="/applications" element={<ResourcePage kind="application" title="Applications" kicker="KEEP MOMENTUM" description="Track each application and its next important date." fields={[["organization", "Organization"], ["status", "Status (saved, applied, interview, offer, rejected, withdrawn)"], ["deadline", "Next date (optional)"], ["notes", "Notes"]]} />} /><Route path="/analytics" element={<AnalyticsPage />} /><Route path="/mentorship" element={<MentorshipPage />} /><Route path="/community" element={<CommunityPage />} /><Route path="/copilot" element={<CopilotPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></div>
    </main>
  </div>;
}

function PageHeading({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function LoadingLine() { return <div className="loading-line"><span className="spinner" /> Loading your data</div>; }
function QueryError({ error }: { error: unknown }) { const raw = error instanceof Error ? error.message : "Could not load data."; const message = /MongoDB|Firebase|Stripe|AI provider|credential|Atlas|Vercel|Render|storage|provider configuration/i.test(raw) ? "This service is temporarily unavailable. Please try again shortly." : raw; return <div className="error-panel"><ShieldAlert size={17} /><span>{message}</span></div>; }
function EmptyState({ icon: Icon = Sparkles, title, text, action }: { icon?: typeof Sparkles; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Icon size={19} /></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
function StatCard({ label, value, helper, icon: Icon, trend }: { label: string; value: string | number; helper: string; icon: typeof Activity; trend?: string }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={16} /></span></div><div className="stat-value">{value}</div><div className="stat-helper">{trend && <span className="trend"><ArrowUpRight size={12} /> {trend}</span>}{helper}</div></div>; }

function DashboardPage({ name }: { name: string }) {
  const profileQuery = useProfile(); const profile = readProfile(profileQuery.data);
  const gap = useQuery({ queryKey: ["skill-gap"], queryFn: () => api.get<{ career?: Career; gap: SkillGapItem[]; coverage: number }>("/skill-gap"), retry: false });
  const today = useQuery({ queryKey: ["today"], queryFn: () => api.get<any>("/today"), retry: false });
  const roadmap = useRecords("roadmap"); const applications = useRecords("application"); const projects = useRecords("project");
  const tasks = roadmap.data?.flatMap((row) => row.data.tasks ?? []) ?? []; const done = tasks.filter((task: any) => task.status === "COMPLETED").length;
  const unfinished = tasks.find((task: any) => task.status !== "COMPLETED");
  return <>
    <PageHeading kicker={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()} title={`A good day to grow, ${name}.`} description="Small, focused steps add up. Here’s where your path stands today." action={<Link className="button button-soft" to="/career"><Compass size={15} /> View my path</Link>} />
    {profileQuery.isError && <QueryError error={profileQuery.error} />}
    {!profile && !profileQuery.isLoading && <div className="onboarding-banner"><div className="banner-spark"><Sparkles size={20} /></div><div><strong>Your path starts with you.</strong><p>Add a few details about your goals and skills to get a more useful career plan.</p></div><Link to="/profile" className="button button-primary">Set up profile <ArrowRight size={15} /></Link></div>}
    <div className="stats-grid"><StatCard label="Skill coverage" value={gap.data?.coverage !== undefined ? `${gap.data.coverage}%` : "—"} helper={gap.data?.career?.title ?? "Choose a career path"} icon={Target} /><StatCard label="Roadmap progress" value={tasks.length ? `${done}/${tasks.length}` : "—"} helper={tasks.length ? "steps completed" : "Build a roadmap"} icon={CheckCircle2} /><StatCard label="Applications" value={applications.data?.length ?? "—"} helper="you’re keeping in motion" icon={BriefcaseBusiness} /><StatCard label="Projects" value={projects.data?.length ?? "—"} helper="evidence of your growth" icon={Code2} /></div>
    <div className="dashboard-grid"><section className="surface-card next-step-card"><div className="card-heading"><div><div className="eyebrow">YOUR NEXT STEP</div><h2>{unfinished?.title ?? "Choose a direction"}</h2></div><span className="icon-chip"><ArrowUpRight size={16} /></span></div>{unfinished ? <><p>{unfinished.description}</p><div className="task-meta"><span className="skill-token">{unfinished.skill}</span><span>About {unfinished.estimateHours ?? 4} hours</span></div><Link to="/career" className="text-action">Open roadmap <ArrowRight size={15} /></Link></> : <><p>{profile?.data?.targetCareerId ? "Your roadmap is ready to generate from your current skills." : "Pick a career that interests you, then turn the distance into a practical plan."}</p><Link to="/career" className="text-action">Explore career paths <ArrowRight size={15} /></Link></>}</section>
</div>
    {today.data && <section className="surface-card today-agenda"><div className="card-heading"><div><div className="eyebrow">TODAY</div><h2>Your real commitments</h2></div><span className="status-label">{today.data.counts.unreadNotifications} unread</span></div>{today.data.upcomingApplications.length || today.data.roadmapTasks.length ? <div className="agenda-list">{today.data.upcomingApplications.slice(0, 3).map((application: Row) => <div className="agenda-item" key={application._id}><span className="agenda-mark deadline"><Bell size={13} /></span><div><strong>{application.title}</strong><small>Application · {application.data.deadline}</small></div><Link to="/applications" className="text-action">Review</Link></div>)}{today.data.roadmapTasks.slice(0, 3).map((task: any) => <div className="agenda-item" key={task.id}><span className="agenda-mark"><CheckCircle2 size={13} /></span><div><strong>{task.title}</strong><small>Roadmap · {task.careerTitle}</small></div><Link to="/career" className="text-action">Continue</Link></div>)}</div> : <p className="quiet-empty">No upcoming roadmap steps or application deadlines have been recorded.</p>}{today.data.notifications.length > 0 && <p className="agenda-note">You have {today.data.notifications.length} unread notifications recorded.</p>}</section>}
    <section className="surface-card progress-card"><div className="card-heading"><div><div className="eyebrow">CAREER SNAPSHOT</div><h2>{gap.data?.career?.title ?? "Your personal growth map"}</h2></div><Link to="/career" className="text-action">Open career path <ArrowRight size={15} /></Link></div>
      {gap.isLoading ? <LoadingLine /> : gap.data?.gap?.length ? <><div className="coverage-bar"><span style={{ width: `${gap.data.coverage}%` }} /></div><div className="skill-row">{gap.data.gap.slice(0, 6).map((item) => <SkillPill key={item.name} item={item} />)}</div></> : <EmptyState title="Your career map takes shape here" text="Add your skills and choose a career to see the shared skill-gap engine at work." action={<Link to="/career" className="text-action">Set a target career <ArrowRight size={14} /></Link>} />}</section>
    <div className="dashboard-bottom"><Link to="/assessments" className="quick-card"><div className="quick-icon coral"><ClipboardCheck size={18} /></div><div><strong>Check your skills</strong><span>Take an assessment</span></div><ArrowUpRight size={15} /></Link><Link to="/opportunities" className="quick-card"><div className="quick-icon blue"><Search size={18} /></div><div><strong>Find an opening</strong><span>Save an opportunity</span></div><ArrowUpRight size={15} /></Link><Link to="/copilot" className="quick-card"><div className="quick-icon violet"><Sparkles size={18} /></div><div><strong>Think it through</strong><span>Ask your career copilot</span></div><ArrowUpRight size={15} /></Link></div>
  </>;
}

function ProfilePage() {
  const profile = useProfile(); const queryClient = useQueryClient(); const current = readProfile(profile.data); const [name, setName] = useState(""); const [education, setEducation] = useState(""); const [interests, setInterests] = useState(""); const [skills, setSkills] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { if (current) { setName(current.data.displayName ?? ""); setEducation(current.data.education ?? ""); setInterests((current.data.interests ?? []).join(", ")); setSkills((current.data.skills ?? []).map((skill: Skill) => `${skill.name}: ${skill.level}`).join("\n")); } }, [current?._id]);
  const save = useMutation({ mutationFn: async () => {
    const parsedSkills: Skill[] = skills.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [skill, level = "BEGINNER"] = line.split(":"); return { name: skill.trim(), level: level.trim().toUpperCase() as Skill["level"] }; });
    const safeSkills = parsedSkills.filter((skill) => ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].includes(skill.level));
    const data = { ...(current?.data ?? {}), displayName: name.trim(), education: education.trim(), interests: interests.split(",").map((v) => v.trim()).filter(Boolean), skills: safeSkills, onboardingComplete: true };
    return current ? api.patch(`/resources/profile/${current._id}`, { title: "Career profile", data }) : api.post("/resources/profile", { title: "Career profile", data });
  }, onSuccess: () => { setSaved(true); void queryClient.invalidateQueries({ queryKey: ["records", "profile"] }); void queryClient.invalidateQueries({ queryKey: ["skill-gap"] }); window.setTimeout(() => setSaved(false), 2600); } });
  return <><PageHeading kicker="YOUR FOUNDATION" title="A profile that grows with you." description="Share what’s useful. Your profile powers your career map and recommendations." />{profile.isLoading ? <LoadingLine /> : <section className="surface-card form-card"><div className="form-section-heading"><div className="profile-avatar-large">{name.slice(0, 1).toUpperCase() || "Y"}</div><div><h2>Your profile</h2><p>Only you can see and edit your career details.</p></div></div><div className="form-grid"><label>How should we address you?<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} /></label><label>Education<input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Degree, college and current year" maxLength={300} /></label><label className="span-two">Interests<input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. climate tech, product design, data" /></label><label className="span-two">Skills and current level<textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={'Add one per line, for example:\nJavaScript: INTERMEDIATE\nPython: BEGINNER'} rows={6} /><small className="field-help">Use BEGINNER, INTERMEDIATE, ADVANCED or EXPERT after the colon.</small></label></div><div className="form-footer"><span className="saved-note">{saved && <><CheckCircle2 size={15} /> Saved to your profile</>}</span><button disabled={save.isPending} className="button button-primary" onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save profile"}<ArrowRight size={15} /></button></div>{save.isError && <QueryError error={save.error} />}</section>}</>;
}

function ResourcePage({ kind, title, kicker, description, fields, hideHeading = false }: { kind: string; title: string; kicker: string; description: string; fields: [string, string][]; hideHeading?: boolean }) {
  const records = useRecords(kind); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [titleInput, setTitleInput] = useState(""); const [values, setValues] = useState<Record<string, string>>({});
  const create = useMutation({ mutationFn: () => api.post(`/resources/${kind}`, { title: titleInput.trim(), data: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()).map(([key, value]) => [key, ["skills", "technologies"].includes(key) ? value.split(",").map((item) => item.trim()).filter(Boolean) : value])) }), onSuccess: () => { setTitleInput(""); setValues({}); setOpen(false); void qc.invalidateQueries({ queryKey: ["records", kind] }); } });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/resources/${kind}/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ["records", kind] }) });
  return <>{!hideHeading && <PageHeading kicker={kicker} title={title} description={description} action={<button className="button button-primary" onClick={() => setOpen(!open)}><Plus size={15} /> {open ? "Close" : `Add ${title.replace(/s$/, "").toLowerCase()}`}</button>} />}
    {open && <section className="surface-card quick-form"><div className="card-heading"><div><div className="eyebrow">ADD TO YOUR WORKSPACE</div><h2>Capture a new {title.replace(/s$/, "").toLowerCase()}</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></div><div className="form-grid"><label className="span-two">Title<input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} required maxLength={180} /></label>{fields.map(([key, label]) => <label key={key} className={key === "notes" || key === "body" || key === "description" ? "span-two" : ""}>{label}{key === "notes" || key === "body" || key === "description" ? <textarea value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} rows={3} /> : <input type={key === "deadline" ? "date" : "text"} value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} maxLength={2000} />}</label>)}</div>{create.isError && <QueryError error={create.error} />}<div className="form-footer"><span className="saved-note">Saved privately to your workspace.</span><button className="button button-primary" disabled={!titleInput.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Saving…" : "Save"}<ArrowRight size={15} /></button></div></section>}
    {records.isLoading ? <LoadingLine /> : records.isError ? <QueryError error={records.error} /> : records.data?.length ? <div className="record-grid">{records.data.map((item) => <article className="record-card" key={item._id}><div className="record-card-top"><span className="record-icon"><Sparkles size={16} /></span><button className="icon-button tiny" onClick={() => remove.mutate(item._id)} aria-label={`Remove ${item.title}`}><X size={15} /></button></div><h3>{item.title}</h3><p>{item.data.description || item.data.body || item.data.notes || item.data.organization || item.data.mentorName || "Added to your career workspace."}</p><div className="record-meta">{item.data.status && <span className="status-label">{item.data.status}</span>}{item.data.deadline && <span>Due {item.data.deadline}</span>}{item.data.category && <span>{item.data.category}</span>}</div>{item.data.sourceUrl && <a className="text-action" href={item.data.sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a>}{item.data.repositoryUrl && <a className="text-action" href={item.data.repositoryUrl} target="_blank" rel="noreferrer">View repository <ArrowUpRight size={14} /></a>}</article>)}</div> : <section className="surface-card"><EmptyState icon={kind === "opportunity" ? BriefcaseBusiness : Sparkles} title={`Your ${title.toLowerCase()} space is open`} text={kind === "opportunity" ? "Add a real listing you’ve found. Dhyavora doesn’t invent job or scholarship postings." : `Add your first ${title.replace(/s$/, "").toLowerCase()} when you’re ready. Your entries stay tied to your verified account.`} action={<button className="text-action" onClick={() => setOpen(true)}>Add your first item <ArrowRight size={14} /></button>} /></section>}
  </>;
}

type Assessment = Row & { data: { durationMinutes: number; description?: string; questions: Array<{ id: string; prompt: string; options: string[] }>; career?: string; company?: string; role?: string; difficulty?: string; topics?: string[]; assessmentType?: string } };
type Attempt = { attemptId: string; startedAt: string; durationMinutes: number; questions: Assessment["data"]["questions"] };
type AssessmentPagePayload = {
  data: Assessment[];
  meta: { page: number; limit: number; total: number; pages: number; virtualTotal?: number };
};

const assessmentCareers = ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Data Engineer", "Data Scientist", "ML Engineer", "Cloud Engineer", "DevOps Engineer", "Cybersecurity Engineer"];
const assessmentCompanies = ["Amazon", "Google", "Microsoft", "Meta", "Apple", "Netflix", "Adobe", "Salesforce", "Oracle", "IBM", "NVIDIA", "Uber", "Atlassian", "Walmart", "Flipkart", "Accenture", "Deloitte", "JPMorgan Chase", "Goldman Sachs", "PayPal"];
const assessmentRoles = ["SDE", "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Data Engineer", "ML Engineer", "Cloud Engineer", "DevOps Engineer", "Platform Engineer"];

function AssessmentPage() {
  const [search, setSearch] = useState("");
  const [career, setCareer] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const assessments = useQuery({
    queryKey: ["assessments", search, career, company, role, difficulty, page],
    queryFn: () => api.getWithMeta<AssessmentPagePayload["data"]>(`/assessments?search=${encodeURIComponent(search)}&career=${encodeURIComponent(career)}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&difficulty=${encodeURIComponent(difficulty)}&page=${page}&limit=20`),
    retry: false,
  });
  const history = useQuery({ queryKey: ["assessment-history"], queryFn: () => api.get<Row[]>("/assessment-attempts"), retry: false });
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [attemptError, setAttemptError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();
  const pageData = assessments.data;
  const items = pageData?.data ?? [];
  const total = Number(pageData?.meta?.total ?? 0);
  const pages = Number(pageData?.meta?.pages ?? 1);
  const virtualTotal = Number(pageData?.meta?.virtualTotal ?? 100000);

  function resetPage(next: () => void) {
    setPage(1);
    next();
  }

  const start = useMutation({
    mutationFn: (id: string) => api.post<Attempt>(`/assessments/${id}/attempts`),
    onSuccess: (next) => {
      setAttempt(next);
      setAnswers({});
      setMarked({});
      setSeconds(next.durationMinutes * 60);
      setResult(null);
      setAttemptError("");
    },
  });

  useEffect(() => {
    if (!attempt || result) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((Date.parse(attempt.startedAt) + attempt.durationMinutes * 60_000 - Date.now()) / 1000));
      setSeconds(left);
      if (!left) { window.clearInterval(timer); void submit(); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.attemptId, result]);

  async function answer(index: number, selectedOption?: number, markForReview = Boolean(marked[String(index)])) {
    if (!attempt) return;
    setAnswers((prev) => selectedOption === undefined ? prev : { ...prev, [String(index)]: selectedOption });
    setMarked((prev) => ({ ...prev, [String(index)]: markForReview }));
    try {
      await api.put(`/assessment-attempts/${attempt.attemptId}/answers/${index}`, { ...(selectedOption === undefined ? {} : { selectedOption }), markForReview });
    } catch (error) {
      setAttemptError(error instanceof Error ? error.message : "Answer could not be saved.");
    }
  }

  async function submit() {
    if (!attempt || submitting) return;
    setSubmitting(true);
    setAttemptError("");
    try {
      const next = await api.post<any>(`/assessment-attempts/${attempt.attemptId}/submit`);
      setResult(next);
      setAttempt(null);
      void qc.invalidateQueries({ queryKey: ["assessment-history"] });
    } catch (error) {
      setAttemptError(error instanceof Error ? error.message : "Assessment could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  const timeLabel = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (attempt) return <>
    <PageHeading kicker="ASSESSMENT IN PROGRESS" title={`${attempt.questions.length} questions`} description="Your timer and scoring are controlled by the server." />
    <motion.section className="surface-card active-assessment" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="assessment-live-head">
        <div><div className="eyebrow">SERVER-TIMED · SERVER-SCORED</div><h2>Stay focused.</h2></div>
        <motion.div className={`timer-chip ${seconds < 60 ? "urgent" : ""}`} animate={seconds < 60 ? { scale: [1, 1.04, 1] } : undefined} transition={seconds < 60 ? { duration: .8, repeat: Infinity } : undefined}><Activity size={15} /> {timeLabel}</motion.div>
      </div>
      <div className="question-list">{attempt.questions.map((question, index) =>
        <motion.article className="question-card" key={question.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .035 }}>
          <div className="question-meta"><span>QUESTION {String(index + 1).padStart(2, "0")}</span><button className={`review-button ${marked[String(index)] ? "marked" : ""}`} onClick={() => void answer(index, answers[String(index)], !marked[String(index)])}><CheckCircle2 size={14} /> {marked[String(index)] ? "Marked" : "Mark for review"}</button></div>
          <h3>{question.prompt}</h3>
          <div className="answer-options">{question.options.map((option, optionIndex) => <motion.label whileHover={{ y: -1 }} key={`${question.id}-${optionIndex}`} className={`answer-option ${answers[String(index)] === optionIndex ? "chosen" : ""}`}><input type="radio" name={`question-${index}`} checked={answers[String(index)] === optionIndex} onChange={() => void answer(index, optionIndex)} /><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></motion.label>)}</div>
        </motion.article>
      )}</div>
      <div className="form-footer"><span className="saved-note">{Object.keys(answers).length} answered · {Object.values(marked).filter(Boolean).length} for review</span><button className="button button-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? "Submitting…" : "Submit assessment"} <ArrowRight size={15} /></button></div>
      {attemptError && <QueryError error={new Error(attemptError)} />}
    </motion.section>
  </>;

  return <>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeading kicker="ASSESSMENT HUB" title="Prepare for the work you want." description="Company-oriented Dhyavora simulations built for role, career, topic and difficulty practice—not leaked company tests." />
    </motion.div>

    {result && <motion.section className="surface-card result-card" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="eyebrow">ASSESSMENT COMPLETE</div><div className="result-score">{result.score}<small>points</small></div>
      <div className="result-stats"><span><strong>{result.correct}</strong> correct</span><span><strong>{result.incorrect}</strong> incorrect</span><span><strong>{result.skipped}</strong> skipped</span></div>
      <p>{result.timedOut ? "Time ran out; your answers were submitted by the server." : "Your result is saved in your assessment history."}</p>
      <button className="button button-soft" onClick={() => setResult(null)}>Back to assessments</button>
    </motion.section>}

    {!result && <>
      <motion.section className="assessment-hub-search surface-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }}>
        <div className="assessment-search-head"><div><div className="eyebrow">COMPANY-ORIENTED PREPARATION</div><h2>{total ? total.toLocaleString("en-IN") : "1,00,000+"} simulations in the library</h2><p>Every catalog item is an original Dhyavora simulation tagged to a company, career, role, topic and level.</p></div><span className="assessment-count-badge">≈ {virtualTotal.toLocaleString("en-IN")}</span></div>
        <div className="assessment-search"><Search size={18} /><input value={search} onChange={(e) => resetPage(() => setSearch(e.target.value))} placeholder="Search company, career, skill or topic..." /></div>
        <div className="assessment-filters">
          <select value={career} onChange={(e) => resetPage(() => setCareer(e.target.value))}><option value="">Career</option>{assessmentCareers.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={company} onChange={(e) => resetPage(() => setCompany(e.target.value))}><option value="">Company</option>{assessmentCompanies.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={role} onChange={(e) => resetPage(() => setRole(e.target.value))}><option value="">Role</option>{assessmentRoles.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={difficulty} onChange={(e) => resetPage(() => setDifficulty(e.target.value))}><option value="">Difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option><option>Medium → Hard</option></select>
        </div>
        {(search || career || company || role || difficulty) && <button className="clear-filters" onClick={() => { setSearch(""); setCareer(""); setCompany(""); setRole(""); setDifficulty(""); setPage(1); }}>Clear filters</button>}
      </motion.section>

      <motion.section className="assessment-banner advanced-assessment-banner" initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .11 }}>
        <motion.div className="assessment-banner-icon" animate={{ rotate: [0, 3, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}><ClipboardCheck size={21} /></motion.div>
        <div><div className="eyebrow">ORIGINAL DHYAVORA SIMULATIONS</div><h2>Advanced practice, organized by company.</h2><p>Choose a company and role lane, then progressively move from Easy → Medium → Hard → Medium → Hard simulations.</p></div>
      </motion.section>

      {assessments.isLoading ? <LoadingLine /> : assessments.isError ? <QueryError error={assessments.error} /> : items.length ? <AnimatePresence mode="popLayout">
        <motion.div key={`${page}-${career}-${company}-${role}-${difficulty}-${search}`} className="record-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {items.map((item, index) => <motion.article key={item._id} className="record-card assessment-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: .28, delay: index * .025 }}>
            <div className="record-card-top"><span className="record-icon coral-text"><ClipboardCheck size={16} /></span><span className="duration-pill">{item.data.durationMinutes} min</span></div>
            <h3>{item.title}</h3>
            <p>{item.data.description ?? "Focused preparation for your target role."}</p>
            <div className="record-meta">{item.data.company && <span>{item.data.company}</span>}{item.data.career && <span>{item.data.career}</span>}{item.data.role && <span>{item.data.role}</span>}{item.data.difficulty && <span>{item.data.difficulty}</span>}</div>
            {item.data.topics?.length ? <div className="skill-pills">{item.data.topics.slice(0, 5).map((topic) => <span className="skill-pill" key={topic}>{topic}</span>)}</div> : null}
            <button className="button button-soft button-small" onClick={() => start.mutate(item._id)} disabled={start.isPending}>{start.isPending ? "Starting…" : "Start simulation"}<ArrowRight size={14} /></button>
          </motion.article>)}
        </motion.div>
      </AnimatePresence> : <section className="surface-card"><EmptyState icon={ClipboardCheck} title="No matching assessments" text="Try a broader company, career, role or topic search." /></section>}

      {pages > 1 && <div className="assessment-pagination">
        <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total.toLocaleString("en-IN")}</span>
        <div><button className="button button-soft button-small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span className="assessment-page-number">Page {page} / {pages.toLocaleString("en-IN")}</span><button className="button button-soft button-small" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>
      </div>}

      <section className="surface-card history-card"><div className="card-heading"><div><div className="eyebrow">YOUR PRACTICE</div><h2>Assessment history</h2></div></div>{history.isLoading ? <LoadingLine /> : history.data?.length ? history.data.map((row) => <motion.div className="history-row" key={row._id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}><span className="history-check"><CheckCircle2 size={16} /></span><strong>{row.title}</strong><small>{new Date(row.updatedAt ?? "").toLocaleDateString()}</small><span className="history-score">{row.data.result?.score ?? 0} pts</span></motion.div>) : <p className="quiet-empty">Your completed assessments will be saved here.</p>}</section>
    </>}
  </>;
}

function ResumePage() {
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: () => api.get<Row[]>("/resumes"), retry: false }); const qc = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<{ id: string; title: string; extractedText: string; storagePath: string } | null>(null); const [skills, setSkills] = useState("");
  const upload = useMutation({ mutationFn: async () => { if (!file) throw new Error("Choose a PDF or text file first."); const form = new FormData(); form.append("file", file); return api.upload<{ id: string; title: string; extractedText: string; storagePath: string }>("/resumes", form); }, onSuccess: (result) => { setPreview(result); void qc.invalidateQueries({ queryKey: ["resumes"] }); } });
  const saveStructured = useMutation({ mutationFn: () => preview ? api.patch(`/resumes/${preview.id}/structured`, { skills: skills.split(",").map((item) => item.trim()).filter(Boolean), experience: [], education: [] }) : Promise.reject(new Error("Upload a resume first.")), onSuccess: () => void qc.invalidateQueries({ queryKey: ["resumes"] }) });
  return <><PageHeading kicker="RESUME STUDIO" title="Your experience, in your words." description="Upload a resume to secure Firebase Storage, review the extracted text and confirm the details yourself." />
    <div className="resume-layout"><section className="surface-card upload-card"><div className="upload-mark"><FileText size={21} /></div><h2>Add a resume</h2><p>PDF or plain text · up to 8 MB · private to your account</p><label className="drop-zone"><input type="file" accept="application/pdf,text/plain,.pdf,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><span className="drop-icon"><Plus size={20} /></span><strong>{file?.name ?? "Choose a file to upload"}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or drop it here"}</small></label><button className="button button-primary wide" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? "Uploading securely…" : "Upload and extract text"}<ArrowRight size={15} /></button>{upload.isError && <QueryError error={upload.error} />}<div className="secure-note"><ShieldAlert size={14} /> Stored in a user-scoped Firebase Storage path. Extracted text is returned for your review and isn’t saved to the database.</div></section>
      <div className="resume-right">{preview ? <section className="surface-card parsed-card"><div className="card-heading"><div><div className="eyebrow">EXTRACTED TEXT · REVIEW FIRST</div><h2>{preview.title}</h2></div><span className="status-label success-label">Text extracted</span></div><pre className="resume-preview">{preview.extractedText || "No selectable text was found. This may be a scanned PDF; upload a text-selectable PDF or a plain-text resume."}</pre><div className="soft-note">Only text present in your file is shown. Dhyavora does not invent experience or achievements.</div><label className="parsed-skills">Skills you confirm from this resume<input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Comma separated skills" /></label><button disabled={saveStructured.isPending} className="button button-soft" onClick={() => saveStructured.mutate()}>Save confirmed skills <Check size={14} /></button>{saveStructured.isError && <QueryError error={saveStructured.error} />}</section> : <section className="surface-card resume-empty"><div className="resume-watermark"><FileText size={35} /></div><h2>Keep your evidence grounded.</h2><p>Your resume belongs to you. Review every extracted detail before using it in a career recommendation.</p></section>}
      <section className="surface-card uploaded-list"><div className="card-heading"><div><div className="eyebrow">YOUR DOCUMENTS</div><h2>Stored resumes</h2></div></div>{resumes.isLoading ? <LoadingLine /> : resumes.isError ? <QueryError error={resumes.error} /> : resumes.data?.length ? resumes.data.map((item) => <div className="document-row" key={item._id}><FileText size={17} /><div><strong>{item.title}</strong><small>{item.data.parseState ?? "Uploaded"} · {item.data.sizeBytes ? `${Math.round(item.data.sizeBytes / 1024)} KB` : "Secure storage"}</small></div><span className="status-dot live" /></div>) : <p className="quiet-empty">Your uploaded documents will appear here.</p>}</section></div></div>
  </>;
}

function CopilotPage() {
  const history = useQuery({ queryKey: ["copilot-history"], queryFn: () => api.get<Row[]>("/copilot/history"), retry: false }); const [message, setMessage] = useState(""); const [answer, setAnswer] = useState(""); const [question, setQuestion] = useState("");
  const ask = useMutation({ mutationFn: () => api.post<{ answer: string; context: unknown }>("/copilot", { message: question }), onSuccess: (data) => { setAnswer(data.answer); void history.refetch(); } });
  async function submit(event: FormEvent) { event.preventDefault(); const value = message.trim(); if (!value) return; setQuestion(value); setMessage(""); setAnswer(""); ask.mutate(); }
  return <><PageHeading kicker="CAREER COPILOT" title="Think your next step through." description="A grounded career partner that uses your recorded profile and plan, and tells you when it doesn’t know something." />
    <div className="copilot-layout"><section className="surface-card copilot-chat"><div className="copilot-intro"><div className="copilot-orb"><Sparkles size={20} /></div><div><div className="eyebrow">YOUR CONTEXT, YOUR CONTROL</div><h2>What’s on your mind?</h2><p>Ask about your current skills, roadmap or how to prepare for a goal.</p><small className="field-help">Your saved career context is sent to the AI provider selected in Settings when you ask.</small></div></div><div className="prompt-chips">{["What should I focus on this week?", "How can I show my skills in a project?", "Help me prepare for an interview."].map((text) => <button key={text} onClick={() => setMessage(text)}>{text}<ArrowUpRight size={13} /></button>)}</div><form className="copilot-input" onSubmit={submit}><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={5000} placeholder="Ask a question about your career path…" /><div className="copilot-input-foot"><span>Personal facts are grounded in your saved data.</span><button aria-label="Send message" disabled={!message.trim() || ask.isPending}><Send size={16} /></button></div></form>{ask.isPending && <div className="thinking-row"><span className="spinner" /> Thinking through your context…</div>}{ask.isError && <QueryError error={ask.error} />}{answer && <div className="copilot-answer"><div className="answer-label"><span className="brand-symbol">✦</span> DHYAVORA <small>CAREER COPILOT</small></div><div className="answer-question">{question}</div><p>{answer}</p><div className="answer-tags"><span>[KNOWN_USER_DATA]</span><span>[RECOMMENDATION]</span><span>[GENERAL_INFORMATION]</span></div></div>}</section>
      <aside className="copilot-aside"><section className="surface-card guardrail-card"><div className="guardrail-icon"><ShieldAlert size={17} /></div><h3>Advice with clear edges.</h3><p>Personal facts are labeled as known only when present in your account. Recommendations and general advice stay distinct.</p></section><section className="surface-card history-card"><div className="card-heading"><div><div className="eyebrow">RECENT THINKING</div><h2>Conversation history</h2></div></div>{history.data?.length ? history.data.slice(0, 5).map((row) => <button className="history-prompt" key={row._id} onClick={() => { setQuestion(row.data.message); setAnswer(row.data.answer); }}>{row.data.message}<ArrowUpRight size={13} /></button>) : <p className="quiet-empty">Your previous questions will live here.</p>}</section></aside></div>
  </>;
}

function LearningPage() {
  const recommendations = useQuery({ queryKey: ["learning-recommendations"], queryFn: () => api.get<{ recommendations: Row[]; reason: string }>("/learning/recommendations"), retry: false });
  return <><ResourcePage kind="learning-resource" title="Learning" kicker="LEARN WITH PURPOSE" description="Keep useful resources close and connect learning to your career path." fields={[["description", "What will you learn?"], ["url", "Resource URL"], ["type", "Type (course, article, video)"], ["skills", "Skills (comma separated)"]]} />
    <section className="surface-card recommendations-card"><div className="card-heading"><div><div className="eyebrow">SKILL-GAP MATCHED</div><h2>Learning for your next skill</h2></div><Link className="subtle-link" to="/career">View career gap</Link></div>{recommendations.isLoading ? <LoadingLine /> : recommendations.isError ? <QueryError error={recommendations.error} /> : recommendations.data?.recommendations?.length ? recommendations.data.recommendations.map((item) => <div className="history-row" key={item._id}><span className="history-check"><GraduationCap size={16} /></span><strong>{item.title}</strong><span className="quiet-empty">{item.data.skills?.join?.(", ") ?? "Matched resource"}</span>{item.data.url && <a className="text-action" href={item.data.url} target="_blank" rel="noreferrer">Open <ArrowUpRight size={13} /></a>}</div>) : <p className="quiet-empty">{recommendations.data?.reason ?? "Add resources with skill tags to see which ones match the gaps in your selected career."}</p>}</section></>;
}

function AnalyticsPage() {
  const query = useQuery({ queryKey: ["analytics"], queryFn: () => api.get<any>("/analytics"), retry: false }); const data = query.data;
  return <><PageHeading kicker="TRANSPARENT ANALYTICS" title="See your progress clearly." description="A view of the activity you’ve recorded. No opaque scores or hiring predictions." />{query.isLoading ? <LoadingLine /> : query.isError ? <QueryError error={query.error} /> : <>
    <div className="stats-grid"><StatCard label="Skill coverage" value={`${data.skillCoveragePercent}%`} helper="matched career requirements" icon={Target} /><StatCard label="Roadmap" value={`${data.roadmap.completed}/${data.roadmap.total}`} helper="completed tasks" icon={CheckCircle2} /><StatCard label="Assessments" value={data.assessments.completed} helper={data.assessments.averageScore === null ? "No completed assessments" : `average ${data.assessments.averageScore} points`} icon={ClipboardCheck} /><StatCard label="Learning" value={data.learning.resources} helper={`${data.learning.progressEntries} progress entries`} icon={GraduationCap} /></div>
    <div className="dashboard-grid"><section className="surface-card"><div className="eyebrow">YOUR SKILLS</div><h2 className="analytics-title">Skill coverage by requirement</h2>{data.skills.length ? <><div className="coverage-bar"><span style={{ width: `${data.skillCoveragePercent}%` }} /></div><div className="skill-row">{data.skills.map((item: SkillGapItem) => <SkillPill item={item} key={item.name} />)}</div></> : <p className="quiet-empty">Choose a career with a skill map to calculate coverage.</p>}</section><section className="surface-card"><div className="eyebrow">YOUR ACTIVITY</div><h2 className="analytics-title">Career actions</h2><div className="metric-line"><span>Projects</span><strong>{data.projects}</strong></div><div className="metric-line"><span>AI interviews</span><strong>{data.interviews}</strong></div><div className="metric-line"><span>Applications</span><strong>{Object.values(data.applications as Record<string, number>).reduce((a, b) => a + b, 0)}</strong></div>{Object.entries(data.applications as Record<string, number>).map(([key, value]) => <div className="metric-subline" key={key}>{key}<span>{value}</span></div>)}</section></div><p className="analytics-refresh">Calculated from your recorded data · {new Date(data.generatedAt).toLocaleString()}</p>
  </>}</>;
}

function InterviewPage() {
  const careers = useQuery({ queryKey: ["careers"], queryFn: () => api.get<Career[]>("/careers"), retry: false }); const profile = useProfile(); const targetId = readProfile(profile.data)?.data?.targetCareerId as string | undefined;
  const history = useQuery({ queryKey: ["interviews"], queryFn: () => api.get<Row[]>("/interviews"), retry: false }); const qc = useQueryClient(); const [session, setSession] = useState<Row | null>(null); const [answerText, setAnswerText] = useState(""); const [feedback, setFeedback] = useState<{ strengths: string; improvements: string; nextQuestion: string } | null>(null); const [error, setError] = useState("");
  const start = useMutation({ mutationFn: (careerId: string) => api.post<Row>("/interviews", { careerId }), onSuccess: (row) => { setSession(row); setAnswerText(""); setFeedback(null); setError(""); void qc.invalidateQueries({ queryKey: ["interviews"] }); } });
  const respond = useMutation({ mutationFn: (data: { id: string; answer: string }) => api.post<{ feedback: { strengths: string; improvements: string }; nextQuestion: string }>(`/interviews/${data.id}/answer`, { answer: data.answer }), onSuccess: (result) => { setFeedback({ ...result.feedback, nextQuestion: result.nextQuestion }); setAnswerText(""); void qc.invalidateQueries({ queryKey: ["interviews"] }); }, onError: (reason) => setError(reason instanceof Error ? reason.message : "The answer could not be evaluated.") });
  const finish = useMutation({ mutationFn: (id: string) => api.post(`/interviews/${id}/finish`), onSuccess: () => { setSession(null); setFeedback(null); void qc.invalidateQueries({ queryKey: ["interviews"] }); } });
  const currentQuestion = session?.data.questions?.at(-1)?.prompt as string | undefined;
  function send(event: FormEvent) { event.preventDefault(); if (session && answerText.trim()) { setFeedback(null); respond.mutate({ id: session._id, answer: answerText.trim() }); } }
  return <><PageHeading kicker="AI INTERVIEW" title="Practise out loud, at your pace." description="Get role-relevant questions and specific feedback with AI-powered practice. This is practice, not a hiring score." />
    {error && <QueryError error={new Error(error)} />}{session ? <section className="surface-card interview-practice"><div className="card-heading"><div><div className="eyebrow">LIVE PRACTICE · {session.data.careerTitle}</div><h2>Take your time to think.</h2></div><button className="button button-soft button-small" disabled={finish.isPending} onClick={() => finish.mutate(session._id)}>Finish session <Check size={14} /></button></div><div className="interview-question"><span>YOUR QUESTION</span><p>{feedback?.nextQuestion ?? currentQuestion}</p></div>{feedback && <div className="feedback-grid"><div><span>WHAT LANDED</span><p>{feedback.strengths}</p></div><div><span>AN OPPORTUNITY TO GROW</span><p>{feedback.improvements}</p></div></div>}<form className="copilot-input" onSubmit={send}><textarea rows={6} value={answerText} onChange={(e) => setAnswerText(e.target.value)} maxLength={10000} placeholder="Write or dictate your response in your own words…" /><div className="copilot-input-foot"><span>Your answer stays private to your account.</span><button disabled={!answerText.trim() || respond.isPending} aria-label="Submit answer"><Send size={15} /></button></div></form></section> : <><section className="assessment-banner"><div className="assessment-banner-icon"><MessageCircle size={20} /></div><div><div className="eyebrow">ONE QUESTION AT A TIME</div><h2>Make the interview yours.</h2><p>Choose your target career and Dhyavora will generate role-relevant questions and feedback.</p></div></section>{careers.isLoading ? <LoadingLine /> : careers.data?.length ? <div className="record-grid">{careers.data.map((career) => <article className="record-card" key={career._id}><div className="record-card-top"><span className="record-icon"><Sparkles size={16} /></span>{targetId === career._id && <span className="status-label success-label">YOUR TARGET</span>}</div><h3>{career.title}</h3><p>{career.data.description ?? "A focused role-based interview practice session."}</p><button className="button button-soft button-small" disabled={start.isPending} onClick={() => start.mutate(career._id)}>Start AI interview <ArrowRight size={14} /></button></article>)}</div> : <section className="surface-card"><EmptyState icon={MessageCircle} title="Choose a career first" text="The interview catalog uses the career catalog. Add a role as an administrator and set your target career." action={<Link className="text-action" to="/career">Open career catalog <ArrowRight size={14} /></Link>} /></section>}
      <section className="surface-card history-card"><div className="card-heading"><div><div className="eyebrow">YOUR PRACTICE</div><h2>Interview history</h2></div></div>{history.data?.length ? history.data.map((row) => <div className="history-row" key={row._id}><MessageCircle size={15} className="history-check" /><strong>{row.title}</strong><small>{row.data.status ?? "Saved"}</small></div>) : <p className="quiet-empty">Completed and in-progress sessions appear here.</p>}</section></>}
  </>;
}

function MentorshipPage() {
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: () => api.get<Row[]>("/mentors"), retry: false }); const sessions = useRecords("mentor-session"); const qc = useQueryClient(); const [selected, setSelected] = useState<Row | null>(null); const [availability, setAvailability] = useState(""); const [message, setMessage] = useState("");
  const request = useMutation({ mutationFn: () => selected ? api.post("/mentorship/requests", { mentorId: selected._id, availability, message }) : Promise.reject(new Error("Choose a mentor first.")), onSuccess: () => { setSelected(null); setAvailability(""); setMessage(""); void qc.invalidateQueries({ queryKey: ["records", "mentor-session"] }); } });
  return <><PageHeading kicker="MENTORSHIP" title="Learn with someone who’s been there." description="Browse published mentor profiles and send a real request with a note about what you want to discuss." />{request.isError && <QueryError error={request.error} />}
    {selected && <section className="surface-card quick-form"><div className="card-heading"><div><div className="eyebrow">REQUEST A SESSION</div><h2>{selected.title}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close"><X size={17} /></button></div><div className="form-grid"><label>Times that work for you<input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. weekday evenings" maxLength={200} /></label><label className="span-two">What would you like to talk about?<textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={1500} /></label></div><div className="form-footer"><span className="saved-note">The request will be tied to your account.</span><button className="button button-primary" disabled={!availability.trim() || message.trim().length < 10 || request.isPending} onClick={() => request.mutate()}>Send request <ArrowRight size={14} /></button></div></section>}
    {mentors.isLoading ? <LoadingLine /> : mentors.isError ? <QueryError error={mentors.error} /> : mentors.data?.length ? <div className="record-grid">{mentors.data.map((mentor) => <article className="record-card" key={mentor._id}><div className="record-card-top"><span className="record-icon"><Users size={16} /></span><span className="status-label success-label">AVAILABLE</span></div><h3>{mentor.title}</h3><p>{mentor.data.bio ?? mentor.data.expertise ?? "Published mentor profile."}</p><div className="record-meta">{mentor.data.expertise && <span>{mentor.data.expertise}</span>}{mentor.data.availability && <span>{mentor.data.availability}</span>}</div><button className="button button-soft button-small" onClick={() => setSelected(mentor)}>Request a session <ArrowRight size={13} /></button></article>)}</div> : <section className="surface-card"><EmptyState icon={Users} title="No mentors are listed yet" text="Mentors are published by an administrator after availability and profile details are reviewed." /></section>}
    <section className="surface-card history-card"><div className="card-heading"><div><div className="eyebrow">YOUR CONNECTIONS</div><h2>Mentorship requests</h2></div></div>{sessions.data?.length ? sessions.data.map((row) => <div className="history-row" key={row._id}><span className="history-check"><Users size={16} /></span><strong>{row.data.mentorName ?? row.title}</strong><span className="status-label">{row.data.status ?? "REQUESTED"}</span></div>) : <p className="quiet-empty">Requests and sessions will be tracked here.</p>}</section>
  </>;
}

function CommunityPage() {
  const feed = useQuery({ queryKey: ["community-feed"], queryFn: () => api.get<Row[]>("/community/feed"), retry: false }); const mine = useQuery({ queryKey: ["community-mine"], queryFn: () => api.get<Row[]>("/community/posts/mine"), retry: false }); const qc = useQueryClient(); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [topic, setTopic] = useState(""); const [error, setError] = useState("");
  const post = useMutation({ mutationFn: () => api.post<Row>("/community/posts", { title, body, topic }), onSuccess: () => { setTitle(""); setBody(""); setTopic(""); void qc.invalidateQueries({ queryKey: ["community-mine"] }); } });
  function submit(event: FormEvent) { event.preventDefault(); setError(""); post.mutate(); }
  return <><PageHeading kicker="COMMUNITY" title="Progress is better shared." description="Ask a thoughtful question or share what you’re learning. New posts are reviewed before they appear in the community feed." />
    <section className="surface-card quick-form community-compose"><div className="card-heading"><div><div className="eyebrow">SHARE A THOUGHT</div><h2>Start a conversation</h2></div><span className="status-label">MODERATED</span></div><form onSubmit={submit}><div className="form-grid"><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={180} required /></label><label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="projects, learning, careers…" maxLength={80} /></label><label className="span-two">Your post<textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} minLength={10} maxLength={5000} required /></label></div><div className="form-footer"><span className="saved-note">Posts enter the moderator review queue first.</span><button className="button button-primary" disabled={post.isPending}>{post.isPending ? "Submitting…" : "Submit for review"}<ArrowRight size={14} /></button></div></form>{post.isError && <QueryError error={post.error} />}</section>
    <div className="community-columns"><section className="community-feed"><div className="section-inline-heading"><div><div className="eyebrow">APPROVED POSTS</div><h2>From the community</h2></div><button className="icon-button" onClick={() => void feed.refetch()} aria-label="Refresh feed"><Activity size={15} /></button></div>{feed.isLoading ? <LoadingLine /> : feed.isError ? <QueryError error={feed.error} /> : feed.data?.length ? feed.data.map((item) => <CommunityPost key={item._id} post={item} onError={setError} />) : <section className="surface-card"><EmptyState icon={MessageCircle} title="The feed is getting started" text="Only moderator-approved community posts appear here." /></section>}</section>
      <aside className="surface-card history-card"><div className="eyebrow">YOUR SUBMISSIONS</div><h2 className="analytics-title">Post review status</h2>{mine.isLoading ? <LoadingLine /> : mine.data?.length ? mine.data.map((item) => <div className="history-row" key={item._id}><MessageCircle size={14} className="history-check" /><strong>{item.title}</strong><span className={`status-label ${item.data.moderationStatus === "APPROVED" ? "success-label" : ""}`}>{item.data.moderationStatus ?? "PENDING"}</span></div>) : <p className="quiet-empty">Posts you submit will show up here.</p>}{error && <QueryError error={new Error(error)} />}</aside></div>
  </>;
}

function CommunityPost({ post, onError }: { post: Row; onError(error: string): void }) {
  const [comment, setComment] = useState(""); const [showComments, setShowComments] = useState(false); const [reported, setReported] = useState(false); const qc = useQueryClient();
  const comments = useQuery({ queryKey: ["community-comments", post._id], queryFn: () => api.get<Row[]>(`/community/posts/${post._id}/comments`), enabled: showComments, retry: false });
  const addComment = useMutation({ mutationFn: () => api.post(`/community/posts/${post._id}/comments`, { body: comment }), onSuccess: () => { setComment(""); void qc.invalidateQueries({ queryKey: ["community-comments", post._id] }); } });
  const report = useMutation({ mutationFn: () => api.post(`/community/posts/${post._id}/report`, { reason: "OTHER", details: "Reported by the community feed user." }), onSuccess: () => setReported(true), onError: (error) => onError(error instanceof Error ? error.message : "The report could not be sent.") });
  return <article className="surface-card community-post"><div className="community-author"><span className="workspace-avatar">C</span><div><strong>{post.author ?? "Community member"}</strong><small>{post.data.topic ?? "Career conversation"} · {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recent"}</small></div><button className="text-action" disabled={reported || report.isPending} onClick={() => report.mutate()}>{reported ? "Reported" : "Report"}</button></div><h3>{post.title}</h3><p>{post.data.body}</p><button className="subtle-link" onClick={() => setShowComments(!showComments)}>{showComments ? "Hide discussion" : "View discussion"}</button>{showComments && <div className="comment-area">{comments.isLoading ? <LoadingLine /> : comments.data?.map((item) => <p className="community-comment" key={item._id}>{item.data.body}</p>)}<form className="comment-form" onSubmit={(event) => { event.preventDefault(); addComment.mutate(); }}><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" minLength={2} maxLength={2000} /><button disabled={!comment.trim() || addComment.isPending} aria-label="Comment"><Send size={14} /></button></form>{addComment.isError && <QueryError error={addComment.error} />}</div>}</article>;
}

function AdminPage() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => api.get<any>("/admin/overview"), retry: false }); const moderation = useQuery({ queryKey: ["admin-moderation"], queryFn: () => api.get<{ posts: Row[]; comments: Row[]; reports: Row[] }>("/admin/moderation"), retry: false }); const qc = useQueryClient(); const [title, setTitle] = useState(""); const [kind, setKind] = useState("career"); const [dataJson, setDataJson] = useState('{"description":"","requiredSkills":[]}'); const [formError, setFormError] = useState("");
  const create = useMutation({ mutationFn: () => api.post(kind === "assessment" ? "/admin/assessments" : `/admin/catalog/${kind}`, { title, data: JSON.parse(dataJson) }), onSuccess: () => { setTitle(""); setFormError(""); void qc.invalidateQueries({ queryKey: ["admin-overview"] }); } });
  const moderate = useMutation({ mutationFn: (item: { kind: string; id: string; status: string }) => item.kind === "community-report" ? api.patch(`/admin/reports/${item.id}`, { status: item.status === "APPROVED" ? "RESOLVED" : "DISMISSED" }) : api.patch(`/admin/moderation/${item.kind}/${item.id}`, { status: item.status }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-moderation"] }); void qc.invalidateQueries({ queryKey: ["admin-overview"] }); } });
  return <><PageHeading kicker="ADMIN CONSOLE" title="Steward the Dhyavora workspace." description="Catalog records, user access, audit history and community moderation. The API enforces custom-claim administrator access." />{overview.isError && <QueryError error={overview.error} />}<div className="stats-grid">{Object.entries(overview.data?.records ?? {}).slice(0, 4).map(([label, value]) => <StatCard key={label} label={label} value={value as number} helper="catalog and user records" icon={Activity} />)}</div><div className="dashboard-grid"><section className="surface-card"><div className="eyebrow">PUBLISH A CATALOG ITEM</div><h2 className="analytics-title">Careers, assessments, learning, opportunities or mentors</h2><div className="form-grid"><label>Type<select value={kind} onChange={(e) => { const next = e.target.value; setKind(next); if (next === "assessment") setDataJson('{"description":"","durationMinutes":20,"negativeMark":0,"questions":[{"prompt":"Replace with your question","options":["Option A","Option B"],"correctOption":0,"points":1}],"active":true}'); else if (kind === "assessment") setDataJson('{"description":"","requiredSkills":[]}'); }}>{[["career","Career"],["assessment","Assessment"],["question","Question"],["learning-resource","Learning resource"],["opportunity","Opportunity"],["mentor","Mentor"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} /></label><label className="span-two">Structured data (JSON)<textarea rows={8} value={dataJson} onChange={(e) => setDataJson(e.target.value)} /></label></div>{formError && <div className="inline-error">{formError}</div>}{create.isError && <QueryError error={create.error} />}<button className="button button-primary" disabled={!title.trim() || create.isPending} onClick={() => { try { JSON.parse(dataJson); setFormError(""); create.mutate(); } catch { setFormError("Enter valid JSON before publishing."); } }}>Publish catalog item <ArrowRight size={14} /></button></section><section className="surface-card"><div className="eyebrow">MODERATION QUEUE</div><h2 className="analytics-title">Review community activity</h2>{moderation.isLoading ? <LoadingLine /> : moderation.isError ? <QueryError error={moderation.error} /> : <>{[...(moderation.data?.posts ?? []).map((row) => ({ ...row, _kind: "community-post" })), ...(moderation.data?.comments ?? []).map((row) => ({ ...row, _kind: "community-comment" }))].map((row) => <div className="admin-queue-item" key={row._id}><div><strong>{row.title}</strong><p>{row.data.body}</p></div><div><button className="text-action" onClick={() => moderate.mutate({ kind: row._kind, id: row._id, status: "APPROVED" })}>Approve</button><button className="text-action remove-action" onClick={() => moderate.mutate({ kind: row._kind, id: row._id, status: "REMOVED" })}>Remove</button></div></div>)}{!(moderation.data?.posts?.length || moderation.data?.comments?.length) && <p className="quiet-empty">No pending posts or comments.</p>}</>}</section></div><section className="surface-card history-card"><div className="eyebrow">REPORTS</div><h2 className="analytics-title">Open user reports</h2>{moderation.data?.reports?.length ? moderation.data.reports.map((row) => <div className="admin-queue-item" key={row._id}><div><strong>{row.data.reason} · {row.data.postId}</strong><p>{row.data.details ?? "No details provided."}</p></div><div><button className="text-action" onClick={() => moderate.mutate({ kind: "community-report", id: row._id, status: "APPROVED" })}>Resolve</button><button className="text-action remove-action" onClick={() => moderate.mutate({ kind: "community-report", id: row._id, status: "DISMISSED" })}>Dismiss</button></div></div>) : <p className="quiet-empty">No open reports.</p>}</section></>;
}

function SettingsPage() {
  const github = useQuery({ queryKey: ["github"], queryFn: () => api.get<{ connected: boolean; username?: string; scopes?: string[] }>("/integrations/github"), retry: false });
  const queryClient = useQueryClient();
  const [githubError, setGithubError] = useState("");
  const entitlement = useQuery({ queryKey: ["billing-entitlement"], queryFn: () => api.get<{ plan: string; entitlements: string[]; subscription: { status: string; currentPeriodEnd?: string } | null }>("/billing/entitlements"), retry: false });
  const beginGithub = useMutation({ mutationFn: () => api.post<{ url: string }>("/integrations/github/connect"), onSuccess: ({ url }) => window.location.assign(url), onError: (error) => setGithubError(error instanceof Error ? error.message : "GitHub connection is temporarily unavailable.") });
  const disconnect = useMutation({ mutationFn: () => api.delete("/integrations/github"), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["github"] }) });
  const checkout = useMutation({ mutationFn: () => api.post<{ url: string }>("/billing/checkout", { plan: "premium" }), onSuccess: ({ url }) => window.location.assign(url) });
  const portal = useMutation({ mutationFn: () => api.post<{ url: string }>("/billing/portal"), onSuccess: ({ url }) => window.location.assign(url) });
  const returnFlag = new URLSearchParams(window.location.search).get("github");
  const billingFlag = new URLSearchParams(window.location.search).get("billing");
  return <>
    <PageHeading kicker="YOUR WORKSPACE" title="Settings." description="Manage your account, GitHub connection, and Dhyavora plan." />
    {returnFlag && <div className={returnFlag === "connected" ? "success-banner" : "error-panel"}>{returnFlag === "connected" ? "GitHub connected successfully." : "GitHub connection could not be completed. Please try again."}</div>}
    {billingFlag && <div className={billingFlag === "success" ? "success-banner" : "error-panel"}>{billingFlag === "success" ? "Your checkout was received. Your plan updates after payment verification." : "Checkout was cancelled."}</div>}
    <section className="surface-card integration-settings">
      <div className="card-heading"><div><div className="eyebrow">INTEGRATIONS</div><h2>Connect GitHub</h2></div></div>
      <p className="quiet-empty">Bring your public repository activity into your Dhyavora workspace as optional career evidence.</p>
      <div className="integration-actions">
        {github.data?.connected
          ? <><span className="github-connected">Connected as <strong>{github.data.username}</strong></span><button className="button button-soft button-small" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>Disconnect</button></>
          : <button className="button button-soft button-small" disabled={beginGithub.isPending} onClick={() => beginGithub.mutate()}>{beginGithub.isPending ? "Connecting…" : "Connect GitHub"}<ArrowUpRight size={13} /></button>}
        {githubError && <small className="inline-error">{githubError}</small>}
      </div>
      {github.data?.connected && <GithubRepositories />}
    </section>
    <section className="surface-card premium-settings">
      <div><div className="eyebrow">YOUR PLAN</div><h2>{entitlement.data?.plan === "premium" ? "Dhyavora Premium" : "Dhyavora Free"}</h2><p>{entitlement.data?.plan === "premium" ? "Premium access unlocks additional practice and career intelligence." : "Your career profile, skill map, roadmap and application tracker are ready on the free plan."}</p>{entitlement.data?.subscription?.currentPeriodEnd && <small>Current period ends {new Date(entitlement.data.subscription.currentPeriodEnd).toLocaleDateString()}</small>}</div>
      {entitlement.data?.plan === "premium" ? <button className="button button-soft" disabled={portal.isPending} onClick={() => portal.mutate()}>{portal.isPending ? "Opening…" : "Manage billing"}<ArrowUpRight size={14} /></button> : <button className="button button-primary" disabled={checkout.isPending} onClick={() => checkout.mutate()}>{checkout.isPending ? "Preparing checkout…" : "Explore Premium"}<ArrowRight size={14} /></button>}
      {checkout.isError && <QueryError error={checkout.error} />}{portal.isError && <QueryError error={portal.error} />}{entitlement.isError && <QueryError error={entitlement.error} />}
    </section>
    <section className="surface-card account-settings"><div className="eyebrow">YOUR ACCOUNT</div><h2>Privacy and access</h2><div className="setting-row"><div><strong>Verified sign-in</strong><p>Your account sessions are protected and your workspace data stays scoped to your account.</p></div><span className="status-label success-label">ENABLED</span></div><div className="setting-row"><div><strong>Private by default</strong><p>Your records are private to your account.</p></div><span className="status-label success-label">ENABLED</span></div></section>
  </>;
}

function GithubRepositories() {
  const repositories = useQuery({ queryKey: ["github-repositories"], queryFn: () => api.get<Array<{ fullName: string; url: string; language: string | null; updatedAt: string }>>("/integrations/github/repositories"), retry: false });
  if (repositories.isLoading) return <LoadingLine />; if (repositories.isError) return <QueryError error={repositories.error} />;
  return <div className="github-repos"><strong>Live repositories</strong>{repositories.data?.length ? repositories.data.slice(0, 5).map((repo) => <a key={repo.fullName} href={repo.url} target="_blank" rel="noreferrer">{repo.fullName}<span>{repo.language ?? "—"}</span></a>) : <small>No public repositories were returned.</small>}</div>;
}
