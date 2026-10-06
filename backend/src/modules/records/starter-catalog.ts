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
  {
    title: "Full Stack Developer",
    data: {
      seedKey: "starter-career-full-stack-developer-v1",
      category: "Software Engineering",
      level: "Entry to mid level",
      description: "Ship complete product features across the interface, API and database.",
      requiredSkills: [
        { name: "JavaScript", requiredLevel: "INTERMEDIATE" },
        { name: "React", requiredLevel: "INTERMEDIATE" },
        { name: "API design", requiredLevel: "INTERMEDIATE" },
        { name: "Databases", requiredLevel: "INTERMEDIATE" },
        { name: "Version control", requiredLevel: "BEGINNER" },
        { name: "Testing", requiredLevel: "BEGINNER" },
        { name: "Security basics", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "AI/ML Engineer",
    data: {
      seedKey: "starter-career-ai-ml-engineer-v1",
      category: "AI and Machine Learning",
      level: "Entry to mid level",
      description: "Build, evaluate and deploy machine learning models that solve real product problems.",
      requiredSkills: [
        { name: "Python", requiredLevel: "INTERMEDIATE" },
        { name: "Statistics", requiredLevel: "INTERMEDIATE" },
        { name: "Machine learning", requiredLevel: "INTERMEDIATE" },
        { name: "Data preprocessing", requiredLevel: "INTERMEDIATE" },
        { name: "Model evaluation", requiredLevel: "INTERMEDIATE" },
        { name: "SQL", requiredLevel: "BEGINNER" },
        { name: "MLOps basics", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Data Scientist",
    data: {
      seedKey: "starter-career-data-scientist-v1",
      category: "Data and Analytics",
      level: "Entry to mid level",
      description: "Use statistics and modelling to answer open-ended questions and guide decisions.",
      requiredSkills: [
        { name: "Python", requiredLevel: "INTERMEDIATE" },
        { name: "Statistics", requiredLevel: "ADVANCED" },
        { name: "SQL", requiredLevel: "INTERMEDIATE" },
        { name: "Machine learning", requiredLevel: "INTERMEDIATE" },
        { name: "Data visualization", requiredLevel: "INTERMEDIATE" },
        { name: "Experiment design", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "DevOps Engineer",
    data: {
      seedKey: "starter-career-devops-engineer-v1",
      category: "Cloud and Infrastructure",
      level: "Entry to mid level",
      description: "Automate delivery and keep services reliable, observable and secure.",
      requiredSkills: [
        { name: "Linux", requiredLevel: "INTERMEDIATE" },
        { name: "Version control", requiredLevel: "INTERMEDIATE" },
        { name: "CI/CD", requiredLevel: "INTERMEDIATE" },
        { name: "Cloud platforms", requiredLevel: "INTERMEDIATE" },
        { name: "Containers", requiredLevel: "INTERMEDIATE" },
        { name: "Monitoring", requiredLevel: "BEGINNER" },
        { name: "Security basics", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Cybersecurity Analyst",
    data: {
      seedKey: "starter-career-cybersecurity-analyst-v1",
      category: "Security",
      level: "Entry to mid level",
      description: "Detect, investigate and reduce security risks across systems and teams.",
      requiredSkills: [
        { name: "Networking", requiredLevel: "INTERMEDIATE" },
        { name: "Security basics", requiredLevel: "INTERMEDIATE" },
        { name: "Linux", requiredLevel: "BEGINNER" },
        { name: "Threat analysis", requiredLevel: "INTERMEDIATE" },
        { name: "Incident response", requiredLevel: "BEGINNER" },
        { name: "Written communication", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Mobile App Developer",
    data: {
      seedKey: "starter-career-mobile-app-developer-v1",
      category: "Software Engineering",
      level: "Entry to mid level",
      description: "Design and build reliable mobile apps that feel good to use.",
      requiredSkills: [
        { name: "Programming", requiredLevel: "INTERMEDIATE" },
        { name: "Mobile UI development", requiredLevel: "INTERMEDIATE" },
        { name: "State management", requiredLevel: "INTERMEDIATE" },
        { name: "API design", requiredLevel: "BEGINNER" },
        { name: "Testing", requiredLevel: "BEGINNER" },
        { name: "Version control", requiredLevel: "BEGINNER" },
      ],
    },
  },
  {
    title: "Business Analyst",
    data: {
      seedKey: "starter-career-business-analyst-v1",
      category: "Product",
      level: "Entry to mid level",
      description: "Translate business needs into clear requirements, data and process improvements.",
      requiredSkills: [
        { name: "Requirements analysis", requiredLevel: "INTERMEDIATE" },
        { name: "Spreadsheets", requiredLevel: "INTERMEDIATE" },
        { name: "Written communication", requiredLevel: "INTERMEDIATE" },
        { name: "Stakeholder collaboration", requiredLevel: "INTERMEDIATE" },
        { name: "SQL", requiredLevel: "BEGINNER" },
        { name: "Data visualization", requiredLevel: "BEGINNER" },
        { name: "Process modelling", requiredLevel: "BEGINNER" },
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
  {
    title: "JavaScript and React Essentials",
    data: {
      seedKey: "starter-assessment-js-react-v1",
      description: "Core JavaScript, asynchronous code and React state and rendering concepts.",
      durationMinutes: 12,
      negativeMark: 0,
      active: true,
      questions: [
        { prompt: "What does const do in JavaScript?", options: ["Declares a block-scoped binding that cannot be reassigned", "Declares a global variable", "Makes an object deeply immutable", "Creates a function only"], correctOption: 0, points: 1 },
        { prompt: "Which array method returns a new array containing only the elements that pass a test?", options: ["map", "filter", "reduce", "forEach"], correctOption: 1, points: 1 },
        { prompt: "Which React hook stores local state inside a function component?", options: ["useEffect", "useState", "useMemo", "useRef"], correctOption: 1, points: 1 },
        { prompt: "What does the === operator check in JavaScript?", options: ["Value and type without coercion", "Value only, with coercion", "Object reference only", "Type only"], correctOption: 0, points: 1 },
        { prompt: "When does a useEffect with an empty dependency array run?", options: ["After every render", "After the first render only", "Never", "Before every render"], correctOption: 1, points: 1 },
        { prompt: "What is a Promise?", options: ["An object representing the eventual result of an asynchronous operation", "A synchronous loop", "A CSS feature", "A kind of array"], correctOption: 0, points: 1 },
        { prompt: "Why do items in a rendered React list need a stable key?", options: ["So React can tell which items changed between renders", "So the list is sorted", "So fetch runs faster", "So styles apply"], correctOption: 0, points: 1 },
        { prompt: "What does Array.prototype.map return?", options: ["undefined", "A new array with one result per element", "The original array, changed", "A single reduced value"], correctOption: 1, points: 1 },
      ],
    },
  },
  {
    title: "Python and Machine Learning Basics",
    data: {
      seedKey: "starter-assessment-python-ml-v1",
      description: "Python fundamentals and the core ideas behind training and evaluating models.",
      durationMinutes: 12,
      negativeMark: 0,
      active: true,
      questions: [
        { prompt: "Which Python data structure is ordered and mutable?", options: ["tuple", "list", "frozenset", "str"], correctOption: 1, points: 1 },
        { prompt: "What is overfitting?", options: ["A model fits training data so closely that it generalises poorly", "A model that is too simple to learn patterns", "Training that takes too long", "Data with missing values"], correctOption: 0, points: 1 },
        { prompt: "Why split data into training and test sets?", options: ["To estimate performance on unseen data", "To make training faster", "To remove outliers", "To add more features"], correctOption: 0, points: 1 },
        { prompt: "Which metrics are more informative than accuracy alone on imbalanced classes?", options: ["Precision and recall", "Mean squared error", "R-squared", "Row count"], correctOption: 0, points: 1 },
        { prompt: "What does len([1, 2, 3]) return?", options: ["2", "3", "4", "An error"], correctOption: 1, points: 1 },
        { prompt: "Which library is most commonly used for tabular data in Python?", options: ["Matplotlib", "pandas", "Flask", "pytest"], correctOption: 1, points: 1 },
        { prompt: "What is data leakage?", options: ["Information from outside the training data influencing the model and inflating results", "Losing rows while cleaning data", "Slow model training", "Overwriting a saved model file"], correctOption: 0, points: 1 },
        { prompt: "Which approach helps reduce overfitting?", options: ["Regularisation or collecting more training data", "Training on the test set", "Removing validation entirely", "Using a single feature always"], correctOption: 0, points: 1 },
      ],
    },
  },
  {
    title: "SQL and Data Skills",
    data: {
      seedKey: "starter-assessment-sql-data-v1",
      description: "Joins, aggregation, keys and indexes, and basic descriptive statistics.",
      durationMinutes: 12,
      negativeMark: 0,
      active: true,
      questions: [
        { prompt: "Which JOIN returns only rows that match in both tables?", options: ["INNER JOIN", "LEFT JOIN", "FULL OUTER JOIN", "CROSS JOIN"], correctOption: 0, points: 1 },
        { prompt: "Which clause filters groups after aggregation?", options: ["WHERE", "HAVING", "LIMIT", "DISTINCT"], correctOption: 1, points: 1 },
        { prompt: "What does SELECT DISTINCT city FROM users return?", options: ["Each unique city value once", "The table with duplicates deleted", "Cities sorted in descending order", "The number of users"], correctOption: 0, points: 1 },
        { prompt: "Which statement changes existing rows?", options: ["INSERT", "UPDATE", "ALTER", "SELECT"], correctOption: 1, points: 1 },
        { prompt: "What is a primary key?", options: ["A column or set of columns that uniquely identifies each row", "Any indexed column", "A column that allows duplicates", "A column in another table"], correctOption: 0, points: 1 },
        { prompt: "What is the main purpose of an index?", options: ["Speed up lookups on the indexed columns", "Encrypt stored data", "Reduce the number of rows", "Back up the table"], correctOption: 0, points: 1 },
        { prompt: "What does COALESCE(a, b) return?", options: ["The first argument that is not NULL", "Always a", "The sum of a and b", "NULL if either is NULL"], correctOption: 0, points: 1 },
        { prompt: "Which measure describes how spread out values are?", options: ["Standard deviation", "Median", "Mode", "Count"], correctOption: 0, points: 1 },
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
