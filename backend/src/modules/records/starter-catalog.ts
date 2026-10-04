import { recordModel } from "./model.js";

type SeedRecord = { title: string; data: Record<string, unknown> };

const starterCareers: SeedRecord[] = [
  {
    title: "Frontend Engineer",
    data: {
      seedKey: "starter-career-frontend-engineer-v1",
      category: "Software Engineering",
      level: "Entry to mid level",
      description: "Build accessible, responsive web interfaces and connect them to reliable APIs.",
      requiredSkills: [
        { name: "HTML and CSS", requiredLevel: "INTERMEDIATE" },
        { name: "JavaScript", requiredLevel: "INTERMEDIATE" },
        { name: "React", requiredLevel: "INTERMEDIATE" },
        { name: "Accessibility", requiredLevel: "BEGINNER" },
        { name: "Testing", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Backend Engineer",
    data: {
      seedKey: "starter-career-backend-engineer-v1",
      category: "Software Engineering",
      level: "Entry to mid level",
      description: "Design secure APIs, data models and services that power web and mobile products.",
      requiredSkills: [
        { name: "Programming", requiredLevel: "INTERMEDIATE" },
        { name: "API design", requiredLevel: "INTERMEDIATE" },
        { name: "Databases", requiredLevel: "INTERMEDIATE" },
        { name: "Testing", requiredLevel: "BEGINNER" },
        { name: "Security basics", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Data Analyst",
    data: {
      seedKey: "starter-career-data-analyst-v1",
      category: "Data and Analytics",
      level: "Entry to mid level",
      description: "Turn business questions and imperfect data into clear, useful decisions.",
      requiredSkills: [
        { name: "SQL", requiredLevel: "INTERMEDIATE" },
        { name: "Spreadsheets", requiredLevel: "INTERMEDIATE" },
        { name: "Statistics", requiredLevel: "BEGINNER" },
        { name: "Data visualization", requiredLevel: "BEGINNER" },
        { name: "Python", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "UX Designer",
    data: {
      seedKey: "starter-career-ux-designer-v1",
      category: "Product Design",
      level: "Entry to mid level",
      description: "Research user needs and shape clear, accessible product experiences.",
      requiredSkills: [
        { name: "User research", requiredLevel: "INTERMEDIATE" },
        { name: "Interaction design", requiredLevel: "INTERMEDIATE" },
        { name: "Prototyping", requiredLevel: "BEGINNER" },
        { name: "Accessibility", requiredLevel: "BEGINNER" },
        { name: "Design communication", requiredLevel: "INTERMEDIATE" },
      ],
    },
  },
  {
    title: "Product Manager",
    data: {
      seedKey: "starter-career-product-manager-v1",
      category: "Product",
      level: "Entry to mid level",
      description: "Understand customer problems, align teams and make evidence-informed product decisions.",
      requiredSkills: [
        { name: "Product discovery", requiredLevel: "INTERMEDIATE" },
        { name: "Prioritization", requiredLevel: "INTERMEDIATE" },
        { name: "Product analytics", requiredLevel: "BEGINNER" },
        { name: "Written communication", requiredLevel: "INTERMEDIATE" },
        { name: "Stakeholder collaboration", requiredLevel: "INTERMEDIATE" },
      ],
    },
  },
];

const starterAssessments: SeedRecord[] = [
  {
    title: "Web Development Foundations",
    data: {
      seedKey: "starter-assessment-web-foundations-v1",
      description: "A short check of core web, API, source control and testing concepts.",
      durationMinutes: 10,
      negativeMark: 0,
      active: true,
      questions: [
        { prompt: "Which HTTP method is normally used to create a new resource?", options: ["GET", "POST", "HEAD", "OPTIONS"], correctOption: 1, points: 1 },
        { prompt: "What does a 404 HTTP status usually mean?", options: ["The request succeeded", "The server is restarting", "The requested resource was not found", "The user is authenticated"], correctOption: 2, points: 1 },
        { prompt: "Which SQL clause groups rows for aggregate calculations?", options: ["ORDER BY", "GROUP BY", "LIMIT", "OFFSET"], correctOption: 1, points: 1 },
        { prompt: "What is the main purpose of a unit test?", options: ["Check a small unit of code in isolation", "Deploy the entire application", "Replace user research", "Create a database backup"], correctOption: 0, points: 1 },
        { prompt: "Which Git command shows changes that have not yet been committed?", options: ["git status", "git clone", "git init", "git remote"], correctOption: 0, points: 1 },
      ],
    },
  },
  {
    title: "Data Analysis Foundations",
    data: {
      seedKey: "starter-assessment-data-foundations-v1",
      description: "A short check of practical SQL, statistics and data communication concepts.",
      durationMinutes: 10,
      negativeMark: 0,
      active: true,
      questions: [
        { prompt: "Which SQL function counts all rows in a result set?", options: ["SUM(*)", "COUNT(*)", "TOTAL(*)", "ROWS(*)"], correctOption: 1, points: 1 },
        { prompt: "Which measure is generally less affected by a single extreme outlier?", options: ["Mean", "Median", "Range", "Sum"], correctOption: 1, points: 1 },
        { prompt: "A line chart is usually most useful for showing…", options: ["Change over time", "Parts of one whole only", "A list of names", "Database permissions"], correctOption: 0, points: 1 },
        { prompt: "Before replacing missing values, what should an analyst do first?", options: ["Delete every row", "Understand why values are missing", "Assume they are zero", "Hide the column"], correctOption: 1, points: 1 },
        { prompt: "If two measures move together, what can you conclude from correlation alone?", options: ["One causes the other", "They are associated in this data", "The data has no errors", "The result will generalize everywhere"], correctOption: 1, points: 1 },
      ],
    },
  },
];

async function insertMissing(kind: "career" | "assessment", rows: SeedRecord[]): Promise<number> {
  const model = recordModel(kind);
  let inserted = 0;
  for (const row of rows) {
    try {
      const result = await model.updateOne(
        { userId: "__catalog__", "data.seedKey": row.data.seedKey },
        { $setOnInsert: { userId: "__catalog__", title: row.title, data: row.data, deletedAt: null } },
        { upsert: true },
      );
      inserted += result.upsertedCount;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) continue;
      throw error;
    }
  }
  return inserted;
}

/** Populate useful public starter content in an empty catalog without replacing admin edits. */
export async function seedStarterCatalog(): Promise<void> {
  const [careers, assessments] = await Promise.all([
    insertMissing("career", starterCareers),
    insertMissing("assessment", starterAssessments),
  ]);
  if (careers || assessments) {
    const { logger } = await import("../../shared/logger.js");
    logger.info({ careers, assessments }, "Starter catalog content added");
  }
}
