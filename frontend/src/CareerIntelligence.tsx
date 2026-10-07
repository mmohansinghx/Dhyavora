import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import {
  ArrowRight, BarChart3, BriefcaseBusiness, Check, CheckCircle2, ChevronDown,
  Clock3, Code2, Compass, Flag, Layers3, Map,
  RefreshCw, Search, Sparkles, Target, TrendingUp, Zap,
} from "lucide-react";
import {
  type CareerMatch, type ReadinessSummary, type Skill, type SkillGapItem,
} from "@dhyavora/contracts";
import { api } from "./api";

type SkillLevel = Skill["level"];
type Row<T extends Record<string, unknown> = Record<string, unknown>> = {
  _id: string;
  title: string;
  data: T;
  createdAt?: string;
  updatedAt?: string;
};

type CareerData = {
  category?: string;
  level?: string;
  description?: string;
  roleOverview?: string;
  responsibilities?: string[];
  technologies?: string[];
  interviewTopics?: string[];
  suggestedProjects?: string[];
  requiredSkills?: Array<{ name: string; requiredLevel: SkillLevel }>;
};

type CareerRecord = Row<CareerData>;
type ProfileData = { targetCareerId?: string; skills?: Skill[] };
type RoadmapTask = {
  id: string;
  title: string;
  description: string;
  skill: string;
  kind?: "LEARN" | "PRACTISE" | "PROVE";
  phase?: "FOUNDATION" | "BUILD" | "PROVE";
  estimateHours?: number;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
};
type RoadmapData = {
  careerId?: string;
  careerTitle?: string;
  hoursPerWeek?: number;
  tasks?: RoadmapTask[];
  completionPercent?: number;
  projection?: { weeks: number; date: string } | null;
  generatedAt?: string;
  readiness?: ReadinessSummary;
};
type ProjectData = {
  description?: string;
  skills?: string | string[];
  technologies?: string | string[];
  repositoryUrl?: string;
  liveUrl?: string;
};
type AssessmentAttemptData = {
  assessmentId?: string;
  startedAt?: string;
  status?: string;
  result?: { score?: number; questionCount?: number; correct?: number; incorrect?: number; skipped?: number; submittedAt?: string };
};
type InterviewData = { status?: string; score?: number; completedAt?: string; createdAt?: string };
type ResumeData = { fileName?: string; status?: string; updatedAt?: string };
type LearningData = { category?: string; status?: string; completed?: boolean };
type IntegrationState = { state?: string; provider?: string };

type GapPayload = {
  career?: CareerRecord;
  gap: SkillGapItem[];
  coverage: number;
  readiness?: ReadinessSummary;
};
type MatchesPayload = { matches: CareerMatch[]; leverage?: Array<{ name: string; careerCount: number; careerTitles: string[]; stepsRemaining: number }>; reason?: string };
type Assessment = Row<{ topics?: string[]; career?: string; role?: string; company?: string; difficulty?: string; description?: string }>;
type ActivityItem = { id: string; title: string; type: string; date?: string; detail?: string };

const LEVELS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const LEVEL_LABEL: Record<string, string> = { NONE: "Not started", BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" };
const PHASES = [
  { key: "FOUNDATION" as const, label: "Foundation", hint: "Learn the core ideas" },
  { key: "BUILD" as const, label: "Build", hint: "Practise on real problems" },
  { key: "PROVE" as const, label: "Prove", hint: "Show evidence of the skill" },
];

function useRecords<T extends Record<string, unknown>>(kind: string) {
  return useQuery({ queryKey: ["career-intelligence", "records", kind], queryFn: () => api.get<Array<Row<T>>>(\`/resources/\${kind}\`), retry: false });
}
function useProfile() {
  return useRecords<ProfileData>("profile");
}
function LoadingState() {
  return <div className="ci-state"><div className="ci-spinner" /><span>Loading your career intelligence…</span></div>;
}
function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Career intelligence could not be loaded.";
  return <div className="ci-state ci-error"><strong>Career intelligence could not be loaded.</strong><span>{message}</span></div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="ci-empty"><div className="ci-empty-icon"><Sparkles size={18} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function SectionHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="ci-section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{text && <p>{text}</p>}</div>{action}</div>;
}
function AnimatedCard({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.section className={\`surface-card ci-card \${className}\`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>{children}</motion.section>;
}
function ProgressBar({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, value));
  return <div className="ci-progress"><motion.span initial={{ width: 0 }} animate={{ width: \`\${safe}%\` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>;
}
function ReadinessRing({ value }: { value?: number }) {
  if (value === undefined) return <div className="ci-ring ci-ring-empty"><span>—</span><small>not available</small></div>;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.min(100, Math.max(0, value));
  return <div className="ci-ring" aria-label={\`\${safe}% skill readiness\`}>
    <svg viewBox="0 0 116 116"><circle cx="58" cy="58" r={radius} className="ci-ring-track" /><motion.circle cx="58" cy="58" r={radius} className="ci-ring-value" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - safe / 100) }} transition={{ duration: 0.9 }} transform="rotate(-90 58 58)" /></svg>
    <div><strong>{safe}%</strong><span>skill readiness</span></div>
  </div>;
}
function LevelMeter({ item }: { item: SkillGapItem }) {
  const current = item.currentLevel ? LEVELS.indexOf(item.currentLevel) + 1 : 0;
  const target = LEVELS.indexOf(item.requiredLevel) + 1;
  return <div className="ci-level-meter" aria-label={\`Current \${item.currentLevel ?? "none"}, required \${item.requiredLevel}\`}>
    {LEVELS.map((level, index) => <span key={level} className={\`\${index < current ? "have" : ""} \${index + 1 === target ? "target" : ""}\`} title={level.toLowerCase()} />)}
  </div>;
}
function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function toList(value?: string | string[]) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
function assessmentAccuracy(attempts: Array<Row<AssessmentAttemptData>>) {
  const scored = attempts.map((row) => row.data.result).filter((result): result is NonNullable<AssessmentAttemptData["result"]> => Boolean(result && typeof result.correct === "number" && typeof result.questionCount === "number" && result.questionCount > 0));
  if (!scored.length) return undefined;
  return Math.round(scored.reduce((sum, result) => sum + ((result.correct ?? 0) / (result.questionCount ?? 1)) * 100, 0) / scored.length);
}
function currentWeekCount(items: Array<{ createdAt?: string; updatedAt?: string }>) {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  return items.filter((item) => {
    const date = new Date(item.updatedAt ?? item.createdAt ?? "");
    return Number.isFinite(date.getTime()) && date >= start;
  }).length;
}
function CareerSubnav() {
  const items = [
    ["/career", "Overview"],
    ["/career/explore", "Explore careers"],
    ["/career/skill-gap", "My skill gap"],
    ["/career/roadmap", "My roadmap"],
    ["/career/progress", "Progress"],
    ["/career/readiness", "Readiness"],
  ] as const;
  return <nav className="ci-subnav" aria-label="Career navigation">
    {items.map(([to, label]) => <NavLink key={to} to={to} end={to === "/career"} className={({ isActive }) => \`ci-subnav-link \${isActive ? "active" : ""}\`}>{label}</NavLink>)}
  </nav>;
}

function useCareerData() {
  const profileQuery = useProfile();
  const profile = profileQuery.data?.[0];
  const selectedId = profile?.data.targetCareerId;
  const careers = useQuery({ queryKey: ["career-intelligence", "careers"], queryFn: () => api.get<CareerRecord[]>("/careers"), retry: false });
  const matches = useQuery({ queryKey: ["career-intelligence", "matches"], queryFn: () => api.get<MatchesPayload>("/careers/matches"), retry: false });
  const gap = useQuery({ queryKey: ["career-intelligence", "gap", selectedId], queryFn: () => api.get<GapPayload>(\`/skill-gap\${selectedId ? \`?careerId=\${encodeURIComponent(selectedId)}\` : ""}\`), enabled: Boolean(selectedId), retry: false });
  const roadmaps = useRecords<RoadmapData>("roadmap");
  const projects = useRecords<ProjectData>("project");
  const assessments = useRecords<AssessmentAttemptData>("assessment-attempt");
  const interviews = useRecords<InterviewData>("interview-session");
  const resume = useRecords<ResumeData>("resume-document");
  const learning = useRecords<LearningData>("learning-resource");
  const integrations = useQuery({ queryKey: ["career-intelligence", "integrations"], queryFn: () => api.get<Record<string, IntegrationState>>("/integrations/status"), retry: false });
  return { profileQuery, profile, selectedId, careers, matches, gap, roadmaps, projects, assessments, interviews, resume, learning, integrations };
}

function CareerHero({ title, eyebrow, description, action }: { title: string; eyebrow: string; description: string; action?: ReactNode }) {
  return <motion.div className="ci-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}
  </motion.div>;
}

function OverviewPage() {
  const data = useCareerData();
  const qc = useQueryClient();
  const profile = data.profile;
  const selected = data.gap.data?.career;
  const readiness = data.gap.data?.readiness;
  const roadmap = data.roadmaps.data?.find((row) => row.data.careerId === data.selectedId);
  const tasks = roadmap?.data.tasks ?? [];
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const nextTask = tasks.find((task) => task.status === "IN_PROGRESS") ?? tasks.find((task) => task.status !== "COMPLETED");
  const assessmentAccuracyValue = assessmentAccuracy(data.assessments.data ?? []);
  const githubConnected = Object.values(data.integrations.data ?? {}).some((item) => item.state === "CONNECTED" && (item.provider ?? "").toLowerCase().includes("github"));
  const resumeAvailable = (data.resume.data?.length ?? 0) > 0;
  const projectCount = data.projects.data?.length ?? 0;
  const interviewCount = data.interviews.data?.length ?? 0;
  const unfinished = tasks.filter((task) => task.status !== "COMPLETED").length;
  const recommended = !profile ? { label: "Complete your profile", text: "Add your goals and current skills so Dhyavora can calculate a useful path.", to: "/profile" }
    : !data.selectedId ? { label: "Explore careers", text: "Choose a target career to unlock your canonical skill map.", to: "/career/explore" }
    : (readiness?.missing ?? 0) > 0 ? { label: "Open your skill gap", text: \`\${readiness?.missing} required skills are not yet recorded at the target level.\`, to: "/career/skill-gap" }
    : !roadmap ? { label: "Generate your roadmap", text: "Turn your current gap into learn, practise and prove phases.", to: "/career/roadmap" }
    : nextTask ? { label: "Continue your roadmap", text: nextTask.title, to: "/career/roadmap" }
    : assessmentAccuracyValue !== undefined && assessmentAccuracyValue < 60 ? { label: "Practise an assessment", text: \`Your recorded assessment average is \${assessmentAccuracyValue}%.\`, to: "/assessments" }
    : projectCount === 0 ? { label: "Build project evidence", text: "Add a project that demonstrates your target-career skills.", to: "/projects" }
    : { label: "Review readiness", text: "Your path has current evidence. Review the areas that can move it forward.", to: "/career/readiness" };

  const choose = useMutation({
    mutationFn: (careerId: string) => api.post("/career/target", { careerId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["career-intelligence"] });
      await qc.invalidateQueries({ queryKey: ["records", "profile"] });
      await qc.invalidateQueries({ queryKey: ["skill-gap"] });
    },
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["career-intelligence"] });

  if (data.profileQuery.isLoading || data.careers.isLoading || (data.selectedId && data.gap.isLoading)) return <LoadingState />;
  if (data.profileQuery.isError) return <ErrorState error={data.profileQuery.error} />;

  return <>
    <CareerHero eyebrow="CAREER INTELLIGENCE 2.0" title="Your career path" description="Explore, understand, diagnose, plan, execute, measure, improve." action={<Link className="button button-soft" to="/career/explore"><Compass size={15} /> Explore careers</Link>} />
    <CareerSubnav />
    <div className="ci-hero-grid">
      <AnimatedCard className="ci-path-card">
        <div className="ci-path-copy">
          <div className="eyebrow">TARGET CAREER</div>
          <h2>{selected?.title ?? "Choose your direction"}</h2>
          <p>{selected?.data.description ?? "Your target career connects the catalog, canonical skill-gap engine and roadmap into one operating loop."}</p>
          <div className="ci-inline-meta">{selected?.data.category && <span>{selected.data.category}</span>}{selected?.data.level && <span>{selected.data.level}</span>}{data.selectedId && <span>Target selected</span>}</div>
        </div>
        <ReadinessRing value={readiness?.readiness} />
      </AnimatedCard>
      <AnimatedCard className="ci-next-card" delay={0.06}>
        <div className="eyebrow">CONTINUE YOUR PATH</div>
        <div className="ci-next-icon"><Zap size={19} /></div>
        <h2>{recommended.label}</h2><p>{recommended.text}</p>
        <Link className="button button-primary button-small" to={recommended.to}>Continue <ArrowRight size={14} /></Link>
      </AnimatedCard>
    </div>

    <div className="ci-metric-grid">
      <MetricCard label="Skill coverage" value={data.gap.data ? \`\${data.gap.data.coverage}%\` : "—"} helper={selected?.title ?? "Choose a career"} icon={<Target size={17} />} />
      <MetricCard label="Roadmap progress" value={tasks.length ? \`\${completedTasks}/\${tasks.length}\` : "—"} helper={tasks.length ? "tasks completed" : "No roadmap yet"} icon={<Map size={17} />} />
      <MetricCard label="Projects" value={projectCount || "—"} helper={projectCount ? "evidence items" : "No project evidence yet"} icon={<Code2 size={17} />} />
      <MetricCard label="Assessments" value={assessmentAccuracyValue !== undefined ? \`\${assessmentAccuracyValue}%\` : "—"} helper={data.assessments.data?.length ? "recorded average" : "No scored attempts"} icon={<BarChart3 size={17} />} />
    </div>

    <AnimatedCard className="ci-breakdown-card" delay={0.1}>
      <SectionHeading eyebrow="READINESS SIGNALS" title="What the system can verify" text="Only real account data is shown. A dash means this signal is not available yet." />
      <div className="ci-signal-grid">
        <Signal label="Skills" value={readiness ? \`\${readiness.readiness}%\` : "—"} detail={readiness ? \`\${readiness.matched} matched · \${readiness.developing} developing · \${readiness.missing} missing\` : "Choose a career"} />
        <Signal label="Assessments" value={assessmentAccuracyValue !== undefined ? \`\${assessmentAccuracyValue}%\` : "—"} detail={data.assessments.data?.length ? \`\${data.assessments.data.length} recorded attempt\${data.assessments.data.length === 1 ? "" : "s"}\` : "Not attempted"} />
        <Signal label="Projects" value={projectCount ? String(projectCount) : "—"} detail={projectCount ? "Project evidence on your account" : "Not added"} />
        <Signal label="GitHub" value={githubConnected ? "Connected" : "Not connected"} detail={githubConnected ? "Connection detected from integration status" : "No connected GitHub integration detected"} />
        <Signal label="Resume" value={resumeAvailable ? "On file" : "—"} detail={resumeAvailable ? "Resume document found" : "No resume document found"} />
        <Signal label="Interview" value={interviewCount ? String(interviewCount) : "—"} detail={interviewCount ? "Recorded interview sessions" : "No interview sessions recorded"} />
      </div>
    </AnimatedCard>

    {data.matches.data?.leverage?.length ? <AnimatedCard className="ci-leverage-card" delay={0.14}>
      <SectionHeading eyebrow="HIGHEST LEVERAGE" title="Skills that unlock several paths" text="Calculated by the existing career matching engine." />
      <div className="ci-leverage-grid">{data.matches.data.leverage.map((item) => <div className="ci-leverage" key={item.name}><strong>{item.name}</strong><span>{item.careerCount} careers</span><small>{item.careerTitles.join(" · ")}</small></div>)}</div>
    </AnimatedCard> : null}

    {data.matches.isError && <ErrorState error={data.matches.error} />}
    {data.roadmaps.isError && <ErrorState error={data.roadmaps.error} />}
    {roadmap && unfinished > 0 && <AnimatedCard className="ci-roadmap-preview" delay={0.18}>
      <SectionHeading eyebrow="YOUR ROADMAP" title={\`\${completedTasks} of \${tasks.length} steps complete\`} action={<Link className="text-action" to="/career/roadmap">Open roadmap <ArrowRight size={14} /></Link>} />
      <ProgressBar value={roadmap.data.completionPercent ?? (tasks.length ? completedTasks * 100 / tasks.length : 0)} />
      <div className="ci-preview-task"><div><span className="eyebrow">NEXT</span><strong>{nextTask?.title ?? "All current steps complete"}</strong><p>{nextTask?.description ?? "Update your profile levels to see your next verified gap."}</p></div><Flag size={18} /></div>
      {pace !== (roadmap.data.hoursPerWeek ?? 8) && <div className="ci-quiet-note">Roadmap pace is currently {roadmap.data.hoursPerWeek ?? 8}h/week. The dedicated roadmap view lets you regenerate with a supported pace.</div>}
    </AnimatedCard>}
    <div className="ci-small-actions">
      <Link to="/career/skill-gap" className="ci-action-tile"><Layers3 size={17} /><span><strong>Diagnose</strong><small>Review your canonical skill gap</small></span><ArrowRight size={14} /></Link>
      <Link to="/career/progress" className="ci-action-tile"><TrendingUp size={17} /><span><strong>Measure</strong><small>Review real activity and milestones</small></span><ArrowRight size={14} /></Link>
      <Link to="/career/readiness" className="ci-action-tile"><Sparkles size={17} /><span><strong>Improve</strong><small>See what can move your path forward</small></span><ArrowRight size={14} /></Link>
    </div>
  </>;
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string | number; helper: string; icon: ReactNode }) {
  return <div className="ci-metric"><div className="ci-metric-top"><span>{label}</span><span>{icon}</span></div><strong>{value}</strong><small>{helper}</small></div>;
}
function Signal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="ci-signal"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function ExplorePage() {
  const { careers, matches, profileQuery } = useCareerData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set((careers.data ?? []).map((career) => career.data.category).filter((item): item is string => Boolean(item))))], [careers.data]);
  const matchMap = useMemo(() => new Map((matches.data?.matches ?? []).map((item) => [item.careerId, item])), [matches.data]);
  const selectedId = profileQuery.data?.[0]?.data.targetCareerId;
  const filtered = (careers.data ?? []).filter((career) => {
    const haystack = [career.title, career.data.category, career.data.description].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === "All" || career.data.category === category);
  });
  const choose = useMutation({
    mutationFn: (careerId: string) => api.post("/career/target", { careerId }),
    onSuccess: () => void Promise.all([careers.refetch(), profileQuery.refetch(), matches.refetch()]),
  });
  return <>
    <CareerHero eyebrow="EXPLORE" title="Find the work that fits." description="Search the existing career catalog, compare real requirements, and choose a direction without leaving the career loop." />
    <CareerSubnav />
    <AnimatedCard>
      <SectionHeading eyebrow="CAREER CATALOG" title="Explore careers" text="Powered by the existing /careers API. No duplicate frontend catalog." />
      <div className="ci-toolbar"><label className="ci-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search careers…" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      {careers.isLoading ? <LoadingState /> : careers.isError ? <ErrorState error={careers.error} /> : !filtered.length ? <EmptyState title="No careers match that search" text="Try another search or clear the category filter." /> : <div className="ci-career-grid">{filtered.map((career) => {
        const match = matchMap.get(career._id);
        return <motion.article key={career._id} className={\`ci-career-card \${career._id === selectedId ? "selected" : ""}\`} whileHover={{ y: -3 }}>
          <div className="ci-card-icon"><BriefcaseBusiness size={17} /></div>
          <div className="ci-career-card-body"><div className="ci-inline-meta">{career.data.category && <span>{career.data.category}</span>}{career.data.level && <span>{career.data.level}</span>}</div><h3>{career.title}</h3><p>{career.data.description ?? "Description not provided by the career catalog."}</p>
          <div className="ci-chip-list">{(career.data.requiredSkills ?? []).slice(0, 5).map((skill) => <span key={skill.name}>{skill.name}</span>)}</div></div>
          <div className="ci-card-footer"><Link className="text-action" to={\`/career/\${career._id}\`}>View career <ArrowRight size={14} /></Link>{match ? <span className="ci-match-score">{match.readiness}% ready</span> : null}<button className="button button-soft button-small" disabled={choose.isPending} onClick={() => choose.mutate(career._id)}>{career._id === selectedId ? "Selected" : "Choose career"}<Check size={13} /></button></div>
        </motion.article>;
      })}</div>}
    </AnimatedCard>
  </>;
}

function CareerDetailPage() {
  const { careerId } = useParams();
  const data = useCareerData();
  const career = data.careers.data?.find((item) => item._id === careerId);
  const profile = data.profile;
  const selected = profile?.data.targetCareerId === careerId;
  const gapQuery = useQuery({ queryKey: ["career-intelligence", "gap", careerId], queryFn: () => api.get<GapPayload>(\`/skill-gap?careerId=\${encodeURIComponent(careerId ?? "")}\`), enabled: Boolean(careerId), retry: false });
  const choose = useMutation({
    mutationFn: (id: string) => api.post("/career/target", { careerId: id }),
    onSuccess: () => void Promise.all([data.profileQuery.refetch(), data.gap.refetch()]),
  });
  const gap = gapQuery.data?.gap ?? [];
  const nonMatched = gap.filter((item) => item.status !== "MATCHED");
  const firstGap = nonMatched[0];
  const assessments = useQuery({ queryKey: ["career-intelligence", "detail-assessments", firstGap?.name], queryFn: () => api.get<Assessment[]>(\`/assessments?topic=\${encodeURIComponent(firstGap?.name ?? "")}&limit=5\`), enabled: Boolean(firstGap?.name), retry: false });
  const projects = data.projects.data ?? [];
  const projectMatch = firstGap ? projects.find((project) => toList(project.data.skills).some((skill) => skill.toLowerCase() === firstGap.name.toLowerCase()) || toList(project.data.technologies).some((skill) => skill.toLowerCase() === firstGap.name.toLowerCase())) : undefined;
  if (data.careers.isLoading) return <LoadingState />;
  if (data.careers.isError) return <ErrorState error={data.careers.error} />;
  if (!career) return <EmptyState title="Career not found" text="This career is not present in the current catalog." action={<Link className="button button-soft" to="/career/explore">Back to explore</Link>} />;
  const progression = ["Student", "Intern", "Junior Engineer", "Software Engineer", "Senior Engineer", "Staff / Lead"];
  return <>
    <CareerHero eyebrow={career.data.category ?? "CAREER DETAIL"} title={career.title} description={career.data.description ?? "Career details are shown from the existing catalog record."} action={<button className="button button-primary" disabled={choose.isPending} onClick={() => choose.mutate(career._id)}>{selected ? "Selected career" : "Choose career"}<ArrowRight size={15} /></button>} />
    <CareerSubnav />
    <div className="ci-detail-grid">
      <AnimatedCard><SectionHeading eyebrow="CAREER SNAPSHOT" title="What the catalog tells you" /><div className="ci-detail-copy"><p>{career.data.roleOverview ?? career.data.description ?? "Role overview is not available in the catalog."}</p></div>
        {career.data.responsibilities?.length ? <DetailList title="Responsibilities" items={career.data.responsibilities} /> : null}
        {career.data.technologies?.length ? <DetailList title="Technologies" items={career.data.technologies} /> : null}
        {career.data.interviewTopics?.length ? <DetailList title="Interview topics" items={career.data.interviewTopics} /> : null}
        {career.data.suggestedProjects?.length ? <DetailList title="Suggested projects" items={career.data.suggestedProjects} /> : null}
      </AnimatedCard>
      <AnimatedCard delay={0.06}><SectionHeading eyebrow="YOUR POSITION" title="Skill alignment" text="Status comes from the canonical Skill Gap Engine, not simple skill-name matching." />
        {gapQuery.isLoading ? <LoadingState /> : gapQuery.isError ? <ErrorState error={gapQuery.error} /> : gap.length ? <div className="ci-skill-stack">{gap.map((item) => <div className="ci-skill-line" key={item.name}><div><strong>{item.name}</strong><small>{item.status === "MATCHED" ? "Matched" : item.status === "DEVELOPING" ? "Developing" : "Missing"} · target {LEVEL_LABEL[item.requiredLevel]}</small></div><LevelMeter item={item} /><span className={\`ci-status \${item.status.toLowerCase()}\`}>{item.status}</span></div>)}</div> : <EmptyState title="No skill map yet" text="This career does not currently expose requirements through the canonical skill-gap data." />}
        {nonMatched.length ? <div className="ci-meaning"><div className="eyebrow">WHAT THIS MEANS FOR YOU</div><p>{nonMatched.slice(0, 3).map((item) => item.name).join(", ")} {nonMatched.length === 1 ? "is" : "are"} the current open gap{nonMatched.length > 1 ? "s" : ""} for this career.</p><Link className="text-action" to="/career/skill-gap">See my skill gap <ArrowRight size={14} /></Link></div> : null}
      </AnimatedCard>
    </div>
    <AnimatedCard>
      <SectionHeading eyebrow="CAREER PROGRESSION" title="A simple progression view" text="This is a visualization only; verified progression data is not currently exposed by the catalog API." />
      <div className="ci-progression">{progression.map((stage, index) => <div className="ci-progression-node" key={stage}><span>{index + 1}</span><strong>{stage}</strong>{index < progression.length - 1 && <i />}</div>)}</div>
    </AnimatedCard>
    {nonMatched.length ? <AnimatedCard>
      <SectionHeading eyebrow="SUPPORTED NEXT STEPS" title="Recommendations grounded in available data" />
      <div className="ci-recommend-grid">
        {assessments.data?.[0] ? <Link className="ci-recommend" to="/assessments"><ClipboardIcon /><span><strong>Practice {firstGap?.name}</strong><small>{assessments.data[0].title}{assessments.data[0].data.difficulty ? \` · \${assessments.data[0].data.difficulty}\` : ""}</small></span><ArrowRight size={14} /></Link> : null}
        {projectMatch ? <Link className="ci-recommend" to="/projects"><Code2 /><span><strong>Review your project evidence</strong><small>{projectMatch.title} references {firstGap?.name}</small></span><ArrowRight size={14} /></Link> : null}
        {!assessments.data?.[0] && !projectMatch ? <div className="ci-quiet-note">No matching assessment or project evidence is currently exposed by the available APIs for the first open gap.</div> : null}
      </div>
    </AnimatedCard> : null}
  </>;
}

function ClipboardIcon() {
  return <span className="ci-recommend-icon"><CheckCircle2 size={16} /></span>;
}
function DetailList({ title, items }: { title: string; items: string[] }) {
  return <div className="ci-detail-list"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function SkillGapPage() {
  const data = useCareerData();
  const qc = useQueryClient();
  const profile = data.profile;
  const [expanded, setExpanded] = useState<string | null>(null);
  const gap = data.gap.data?.gap ?? [];
  const readiness = data.gap.data?.readiness;
  const saveLevel = useMutation({
    mutationFn: async ({ name, level }: { name: string; level: SkillLevel | "NONE" }) => {
      const skills = (profile?.data.skills ?? []).filter((skill) => skill.name.trim().toLowerCase() !== name.trim().toLowerCase());
      const nextSkills = level === "NONE" ? skills : [...skills, { name, level }];
      const payload = { ...(profile?.data ?? {}), skills: nextSkills };
      return profile ? api.patch(\`/resources/profile/\${profile._id}\`, { title: "Career profile", data: payload }) : api.post("/resources/profile", { title: "Career profile", data: payload });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["career-intelligence"] });
      await qc.invalidateQueries({ queryKey: ["records", "profile"] });
      await qc.invalidateQueries({ queryKey: ["skill-gap"] });
    },
  });
  if (data.profileQuery.isLoading || (data.selectedId && data.gap.isLoading)) return <LoadingState />;
  if (!data.selectedId) return <><CareerHero eyebrow="DIAGNOSE" title="My skill gap" description="Choose a target career first so the canonical Skill Gap Engine has a real target." /><CareerSubnav /><EmptyState title="Choose a career to unlock your skill map" text="Your profile skills and the selected career requirements become the inputs." action={<Link className="button button-primary" to="/career/explore">Explore careers <ArrowRight size={15} /></Link>} /></>;
  if (data.gap.isError) return <ErrorState error={data.gap.error} />;
  return <>
    <CareerHero eyebrow="DIAGNOSE" title="My skill gap" description={data.gap.data?.career?.title ? \`Your current capability against \${data.gap.data.career.title}.\` : "Your current capability against the selected career."} />
    <CareerSubnav />
    <div className="ci-hero-grid">
      <AnimatedCard className="ci-gap-summary"><ReadinessRing value={readiness?.readiness} /><div><div className="eyebrow">OVERALL COVERAGE</div><h2>{readiness?.readiness ?? data.gap.data?.coverage ?? 0}%</h2><p>{readiness ? \`\${readiness.matched} matched · \${readiness.developing} developing · \${readiness.missing} critical gaps · \${readiness.hoursRemaining}h estimated remaining\` : "Current coverage is available from the skill-gap service."}</p></div></AnimatedCard>
      <AnimatedCard><div className="ci-mini-grid"><Signal label="Strong skills" value={String(readiness?.matched ?? 0)} detail="Matched at required level" /><Signal label="Developing" value={String(readiness?.developing ?? 0)} detail="Below required level" /><Signal label="Critical gaps" value={String(readiness?.missing ?? 0)} detail="No recorded level" /></div></AnimatedCard>
    </div>
    {!gap.length ? <EmptyState title="No skill requirements are available" text="The selected career does not currently expose a canonical skill map." /> : <AnimatedCard>
      <SectionHeading eyebrow="SKILL MAP" title="Current capability → target capability" text="Level values are saved to your profile and reused by the canonical engine." />
      <div className="ci-gap-list">{gap.map((item) => {
        const open = expanded === item.name;
        return <div className={\`ci-gap-item \${open ? "open" : ""}\`} key={item.name}>
          <button className="ci-gap-main" onClick={() => setExpanded(open ? null : item.name)} aria-expanded={open}><div><strong>{item.name}</strong><small>{item.currentLevel ? LEVEL_LABEL[item.currentLevel] : "Not started"} → {LEVEL_LABEL[item.requiredLevel]}</small></div><LevelMeter item={item} /><span className={\`ci-status \${item.status.toLowerCase()}\`}>{item.status}</span><ChevronDown size={16} /></button>
          <AnimatePresence initial={false}>{open && <motion.div className="ci-gap-details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div><span>Why it matters</span><p>It is part of the selected career's required skill map at the {LEVEL_LABEL[item.requiredLevel]} level.</p></div>
            <div><span>What to learn</span><p>{item.status === "MISSING" ? \`Start with the fundamentals of \${item.name}.\` : \`Strengthen \${item.name} until it reaches the target level.\`}</p></div>
            <div><span>What to practise</span><p>Use the existing roadmap and assessment surfaces to practise this skill when matching data is available.</p></div>
            <label><span>Your recorded level</span><select value={item.currentLevel ?? "NONE"} disabled={saveLevel.isPending} onChange={(event) => saveLevel.mutate({ name: item.name, level: event.target.value as SkillLevel | "NONE" })}>{["NONE", ...LEVELS].map((level) => <option key={level} value={level}>{LEVEL_LABEL[level]}</option>)}</select></label>
          </motion.div>}</AnimatePresence>
        </div>;
      })}</div>
      {saveLevel.isError && <ErrorState error={saveLevel.error} />}
    </AnimatedCard>}
    <div className="ci-small-actions"><Link to="/career/roadmap" className="ci-action-tile"><Map size={17} /><span><strong>Plan the gap</strong><small>Open your generated roadmap</small></span><ArrowRight size={14} /></Link><Link to="/assessments" className="ci-action-tile"><BarChart3 size={17} /><span><strong>Test yourself</strong><small>Use assessment evidence</small></span><ArrowRight size={14} /></Link></div>
  </>;
}

function RoadmapPage() {
  const data = useCareerData();
  const qc = useQueryClient();
  const roadmap = data.roadmaps.data?.find((row) => row.data.careerId === data.selectedId);
  const tasks = roadmap?.data.tasks ?? [];
  const [filter, setFilter] = useState<"ALL" | "CURRENT" | "COMPLETED">("ALL");
  const [pace, setPace] = useState(roadmap?.data.hoursPerWeek ?? 8);
  const [busy, setBusy] = useState<string | null>(null);
  const generate = useMutation({
    mutationFn: () => api.post(\`/roadmaps/generate\`, { careerId: data.selectedId, hoursPerWeek: pace }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["career-intelligence"] }); await qc.invalidateQueries({ queryKey: ["records", "roadmap"] }); },
  });
  async function updateTask(roadmapId: string, taskId: string, status: RoadmapTask["status"]) {
    setBusy(taskId);
    try { await api.patch(\`/roadmaps/\${roadmapId}/tasks/\${taskId}\`, { status }); await qc.invalidateQueries({ queryKey: ["career-intelligence", "records", "roadmap"] }); } finally { setBusy(null); }
  }
  if (!data.selectedId) return <><CareerHero eyebrow="PLAN" title="My roadmap" description="Generate a plan from your actual skill gap." /><CareerSubnav /><EmptyState title="Select a career first" text="The roadmap generator requires a real target career and its canonical skill map." action={<Link className="button button-primary" to="/career/explore">Explore careers <ArrowRight size={15} /></Link>} /></>;
  const visible = tasks.filter((task) => filter === "ALL" || (filter === "COMPLETED" ? task.status === "COMPLETED" : task.status !== "COMPLETED"));
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const remaining = tasks.filter((task) => task.status !== "COMPLETED").reduce((sum, task) => sum + (task.estimateHours ?? 0), 0);
  const livePace = roadmap?.data.hoursPerWeek ?? pace;
  if (data.roadmaps.isError) return <ErrorState error={data.roadmaps.error} />;
  return <>
    <CareerHero eyebrow="PLAN" title="My roadmap" description="Learn → practise → prove, generated from the existing roadmap engine." action={<button className="button button-soft" disabled={generate.isPending} onClick={() => generate.mutate()}><RefreshCw size={14} /> {generate.isPending ? "Generating…" : roadmap ? "Refresh roadmap" : "Generate roadmap"}</button>} />
    <CareerSubnav />
    <AnimatedCard className="ci-roadmap-hero">
      <div><div className="eyebrow">{data.gap.data?.career?.title ?? "TARGET CAREER"}</div><h2>{completed} of {tasks.length} tasks complete</h2><p>{tasks.length ? \`\${remaining}h of remaining work at \${livePace}h/week.\` : "Generate the roadmap to turn the current gap into a phased plan."}</p></div>
      <div className="ci-roadmap-stat"><strong>{roadmap?.data.completionPercent ?? 0}%</strong><span>complete</span></div>
      <ProgressBar value={roadmap?.data.completionPercent ?? 0} />
    </AnimatedCard>
    {generate.isError && <ErrorState error={generate.error} />}
    <AnimatedCard>
      <div className="ci-roadmap-controls"><div className="segmented">{(["ALL", "CURRENT", "COMPLETED"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "ALL" ? "All" : item === "CURRENT" ? "Current" : "Completed"}</button>)}</div><div className="ci-pace"><Clock3 size={14} /><span>Pace</span>{[4, 8, 12, 20].map((hours) => <button key={hours} className={pace === hours ? "active" : ""} onClick={() => setPace(hours)}>{hours}h</button>)}</div>{roadmap && pace !== livePace ? <span className="ci-quiet-note">Choose Refresh roadmap to apply {pace}h/week.</span> : null}</div>
      {!visible.length ? <EmptyState title={filter === "COMPLETED" ? "No completed tasks yet" : "No current tasks"} text="The roadmap will reflect actual task state from the backend." /> : <div className="ci-timeline">
        {PHASES.map((phase) => {
          const group = visible.filter((task) => (task.phase ?? "FOUNDATION") === phase.key);
          if (!group.length) return null;
          return <div className="ci-phase" key={phase.key}><div className="ci-phase-label"><span>{phase.label}</span><small>{phase.hint}</small></div><div className="ci-phase-line">{group.map((task) => <motion.article key={task.id} className={\`ci-task \${task.status === "COMPLETED" ? "done" : ""}\`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <div className="ci-task-node">{task.status === "COMPLETED" ? <Check size={13} /> : <span />}</div><div className="ci-task-body"><div className="ci-task-top"><div><strong>{task.title}</strong><p>{task.description}</p></div><span>{task.estimateHours ?? 0}h</span></div><div className="ci-task-meta"><span>{task.skill}</span><span>{task.kind ?? "TASK"}</span><div className="ci-status-switch">{(["TODO", "IN_PROGRESS", "COMPLETED"] as const).map((status) => <button key={status} disabled={busy === task.id} className={task.status === status ? "active" : ""} onClick={() => task.status !== status && void updateTask(roadmap?._id ?? "", task.id, status)}>{status === "TODO" ? "Not started" : status === "IN_PROGRESS" ? "In progress" : "Completed"}</button>)}</div></div></div>
          </motion.article>)}</div></div>;
        })}
      </div>}
    </AnimatedCard>
  </>;
}

function ProgressPage() {
  const data = useCareerData();
  const tasks = data.roadmaps.data?.flatMap((row) => row.data.tasks ?? []) ?? [];
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const assessment = assessmentAccuracy(data.assessments.data ?? []);
  const projectCount = data.projects.data?.length ?? 0;
  const learningCount = data.learning.data?.length ?? 0;
  const interviewCount = data.interviews.data?.length ?? 0;
  const activityCount = currentWeekCount([
    ...(data.roadmaps.data ?? []),
    ...(data.projects.data ?? []),
    ...(data.assessments.data ?? []),
    ...(data.learning.data ?? []),
    ...(data.interviews.data ?? []),
  ]);
  const activities: ActivityItem[] = [
    ...(data.roadmaps.data ?? []).filter((row) => row.data.completionPercent !== undefined).map((row) => ({ id: \`roadmap-\${row._id}\`, title: \`\${row.title} updated\`, type: "Roadmap", date: row.updatedAt ?? row.createdAt, detail: \`\${row.data.completionPercent}% complete\` })),
    ...(data.projects.data ?? []).map((row) => ({ id: \`project-\${row._id}\`, title: row.title, type: "Project", date: row.updatedAt ?? row.createdAt, detail: "Project evidence" })),
    ...(data.assessments.data ?? []).filter((row) => row.data.result).map((row) => ({ id: \`assessment-\${row._id}\`, title: row.title, type: "Assessment", date: row.data.result?.submittedAt ?? row.updatedAt, detail: typeof row.data.result?.score === "number" ? \`\${row.data.result.score} pts\` : "Scored attempt" })),
    ...(data.interviews.data ?? []).map((row) => ({ id: \`interview-\${row._id}\`, title: row.title, type: "Interview", date: row.data.completedAt ?? row.data.createdAt ?? row.updatedAt, detail: row.data.status ?? "Recorded session" })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 8);
  return <>
    <CareerHero eyebrow="MEASURE" title="Progress" description="A record of what you have actually done—not a fabricated growth curve." />
    <CareerSubnav />
    <div className="ci-metric-grid">
      <MetricCard label="Skill readiness" value={data.gap.data?.readiness ? \`\${data.gap.data.readiness.readiness}%\` : "—"} helper={data.gap.data?.career?.title ?? "Choose a career"} icon={<Target size={17} />} />
      <MetricCard label="Roadmap" value={tasks.length ? \`\${completed}/\${tasks.length}\` : "—"} helper={tasks.length ? "tasks completed" : "No roadmap tasks"} icon={<Map size={17} />} />
      <MetricCard label="Assessments" value={assessment !== undefined ? \`\${assessment}%\` : "—"} helper={data.assessments.data?.length ? "recorded average" : "No scored attempts"} icon={<BarChart3 size={17} />} />
      <MetricCard label="Projects" value={projectCount || "—"} helper={projectCount ? "evidence items" : "No projects"} icon={<Code2 size={17} />} />
    </div>
    <AnimatedCard><SectionHeading eyebrow="WEEKLY ACTIVITY" title={\`\${activityCount} recorded update\${activityCount === 1 ? "" : "s"} this week\`} text="Counted from timestamps exposed by the existing records." /><div className="ci-activity-strip"><ActivityDot label="Roadmap" value={data.roadmaps.data?.length ?? 0} /><ActivityDot label="Projects" value={projectCount} /><ActivityDot label="Learning" value={learningCount} /><ActivityDot label="Interviews" value={interviewCount} /></div></AnimatedCard>
    <AnimatedCard><SectionHeading eyebrow="SKILL EVOLUTION" title="Historical skill change" text="No historical skill snapshots are exposed by the current APIs, so Dhyavora does not invent a chart." /><EmptyState title="Your skill history will appear here" text="Complete real activities and add historical skill snapshots when that data becomes available." /></AnimatedCard>
    <AnimatedCard><SectionHeading eyebrow="ROADMAP COMPLETION" title="Current roadmap state" />{tasks.length ? <><ProgressBar value={data.roadmaps.data?.find((row) => row.data.careerId === data.selectedId)?.data.completionPercent ?? completed * 100 / tasks.length} /><div className="ci-quiet-note">{completed} completed out of {tasks.length} current roadmap tasks.</div></> : <EmptyState title="No roadmap history yet" text="Generate a roadmap to begin measuring completion." />}</AnimatedCard>
    <AnimatedCard><SectionHeading eyebrow="RECENT MILESTONES" title="Recent real activity" />{activities.length ? <div className="ci-activity-list">{activities.map((item) => <div className="ci-activity" key={item.id}><div className="ci-activity-icon"><CheckCircle2 size={15} /></div><div><strong>{item.title}</strong><span>{item.type} · {formatDate(item.date)}</span></div><small>{item.detail}</small></div>)}</div> : <EmptyState title="No activity to show yet" text="Your progress history will appear here as you complete real activities." />}</AnimatedCard>
  </>;
}
function ActivityDot({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function ReadinessPage() {
  const data = useCareerData();
  const readiness = data.gap.data?.readiness;
  const tasks = data.roadmaps.data?.flatMap((row) => row.data.tasks ?? []) ?? [];
  const incompleteTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const assessment = scorePercent(data.assessments.data ?? []);
  const projects = data.projects.data?.length ?? 0;
  const githubConnected = Object.values(data.integrations.data ?? {}).some((item) => item.state === "CONNECTED" && (item.provider ?? "").toLowerCase().includes("github"));
  const resumeAvailable = (data.resume.data?.length ?? 0) > 0;
  const interviewCount = data.interviews.data?.length ?? 0;
  const blockers = [
    readiness?.missing ? \`Your largest current gap includes \${(data.gap.data?.gap ?? []).filter((item) => item.status === "MISSING").slice(0, 2).map((item) => item.name).join(" and ")}.\` : null,
    incompleteTasks.length ? \`Your roadmap has \${incompleteTasks.length} incomplete task\${incompleteTasks.length === 1 ? "" : "s"}.\` : null,
    projects === 0 ? "Your project evidence is limited because no projects are recorded." : null,
    !githubConnected ? "GitHub is not connected, so GitHub evidence is not available." : null,
    !resumeAvailable ? "No resume document is recorded." : null,
    interviewCount === 0 ? "No interview sessions are recorded." : null,
  ].filter((item): item is string => Boolean(item));
  const actions = [
    readiness?.missing ? { label: "Close the top skill gap", text: "Review your missing and developing skills.", to: "/career/skill-gap" } : null,
    incompleteTasks.length ? { label: "Continue the roadmap", text: \`\${incompleteTasks.length} task\${incompleteTasks.length === 1 ? "" : "s"} remain.\`, to: "/career/roadmap" } : null,
    assessment !== undefined && assessment < 60 ? { label: "Practise assessments", text: \`Recorded average: \${assessment}%.\`, to: "/assessments" } : null,
    projects === 0 ? { label: "Add project evidence", text: "Record a project that demonstrates your target skills.", to: "/projects" } : null,
    !resumeAvailable ? { label: "Build your resume", text: "Add a resume document when ready.", to: "/resume" } : null,
  ].filter((item): item is { label: string; text: string; to: string } => Boolean(item));
  return <>
    <CareerHero eyebrow="IMPROVE" title="Career readiness" description="A transparent view of the evidence Dhyavora can verify for your selected path." />
    <CareerSubnav />
    <div className="ci-readiness-hero">
      <AnimatedCard className="ci-readiness-score"><ReadinessRing value={readiness?.readiness} /><div><div className="eyebrow">SKILL READINESS</div><h2>{readiness ? \`\${readiness.readiness}%\` : "—"}</h2><p>{data.gap.data?.career?.title ?? "Choose a career to calculate skill readiness."}</p></div></AnimatedCard>
      <AnimatedCard className="ci-readiness-breakdown"><SectionHeading eyebrow="BREAKDOWN" title="Evidence signals" /><div className="ci-breakdown-list">
        <Signal label="Skills" value={readiness ? \`\${readiness.readiness}%\` : "—"} detail={readiness ? \`\${readiness.matched} matched · \${readiness.developing} developing · \${readiness.missing} missing\` : "No target career"} />
        <Signal label="Assessments" value={assessment !== undefined ? \`\${assessment}%\` : "—"} detail={data.assessments.data?.length ? "Recorded assessment performance" : "No scored attempts"} />
        <Signal label="Projects" value={projects ? String(projects) : "—"} detail={projects ? "Recorded project evidence" : "No project evidence"} />
        <Signal label="GitHub" value={githubConnected ? "Connected" : "Not connected"} detail={githubConnected ? "Integration detected" : "No connected integration detected"} />
        <Signal label="Resume" value={resumeAvailable ? "On file" : "—"} detail={resumeAvailable ? "Resume document found" : "No resume document"} />
        <Signal label="Interview" value={interviewCount ? String(interviewCount) : "—"} detail={interviewCount ? "Recorded sessions" : "No recorded sessions"} />
      </div></AnimatedCard>
    </div>
    <AnimatedCard><SectionHeading eyebrow="WHAT IS HOLDING YOU BACK?" title={blockers.length ? "Your current limiting signals" : "No blocking signal detected"} text="Statements below are derived only from current account data." />{blockers.length ? <div className="ci-blockers">{blockers.map((item) => <div key={item}><AlertDot /><span>{item}</span></div>)}</div> : <EmptyState title="Nothing obvious is blocking the path" text="Keep completing real activities and updating your evidence." />}</AnimatedCard>
    <AnimatedCard><SectionHeading eyebrow="RECOMMENDED NEXT ACTIONS" title="Do the next useful thing" />{actions.length ? <div className="ci-action-list">{actions.map((item) => <Link className="ci-action-row" to={item.to} key={item.label}><div><strong>{item.label}</strong><span>{item.text}</span></div><ArrowRight size={15} /></Link>)}</div> : <EmptyState title="No additional action can be justified yet" text="More real activity or a target career will make this view more useful." />}</AnimatedCard>
  </>;
}
function AlertDot() {
  return <span className="ci-alert-dot"><span /></span>;
}

export function CareerIntelligence({ view }: { view: "overview" | "explore" | "skill-gap" | "roadmap" | "progress" | "readiness" | "detail" }) {
  const location = useLocation();
  const detail = view === "detail";
  const content = detail ? <CareerDetailPage /> : view === "explore" ? <ExplorePage /> : view === "skill-gap" ? <SkillGapPage /> : view === "roadmap" ? <RoadmapPage /> : view === "progress" ? <ProgressPage /> : view === "readiness" ? <ReadinessPage /> : <OverviewPage />;
  return <div className={\`career-intelligence \${location.pathname === "/career" ? "career-intelligence-root" : ""}\`}>{content}</div>;
}
