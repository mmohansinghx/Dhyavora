export const VIRTUAL_ASSESSMENT_COUNT = 100_000;

export type VirtualAssessment = {
  _id: string;
  title: string;
  data: {
    description: string;
    durationMinutes: number;
    negativeMark: number;
    career: string;
    company: string;
    role: string;
    difficulty: "Easy" | "Medium" | "Hard" | "Medium → Hard";
    topics: string[];
    assessmentType: "MCQ";
    active: true;
    virtual: true;
    questions: Array<{ id: string; prompt: string; options: string[]; correctOption: number; points: number }>;
  };
};

const COMPANIES = [
  "Amazon", "Google", "Microsoft", "Meta", "Apple", "Netflix", "Adobe", "Salesforce",
  "Oracle", "IBM", "NVIDIA", "Uber", "Atlassian", "Walmart", "Flipkart", "Accenture",
  "Deloitte", "JPMorgan Chase", "Goldman Sachs", "PayPal",
] as const;

const CAREERS = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Engineer", "Data Scientist", "ML Engineer", "Cloud Engineer", "DevOps Engineer",
  "Cybersecurity Engineer",
] as const;

const ROLES = [
  "SDE", "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Data Engineer", "ML Engineer", "Cloud Engineer", "DevOps Engineer", "Platform Engineer",
] as const;

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Medium → Hard"] as const;

const TOPICS = [
  "DSA", "SQL", "JavaScript", "React", "Python", "System Design",
  "APIs", "Cloud", "Testing", "Debugging",
] as const;

type QuestionSeed = { prompt: string; options: string[]; correctOption: number; points: number };

const QUESTION_BANKS: Record<string, QuestionSeed[]> = {
  DSA: [
    { prompt: "Which structure gives average O(1) key lookup?", options: ["Hash table", "Binary heap", "Linked list", "Queue"], correctOption: 0, points: 1 },
    { prompt: "Which traversal is naturally implemented with a queue?", options: ["DFS", "BFS", "Post-order", "In-order"], correctOption: 1, points: 1 },
    { prompt: "What is the typical time complexity of binary search on a sorted array?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctOption: 1, points: 1 },
    { prompt: "Which technique is most useful when a problem asks for the best subarray under a local running constraint?", options: ["Sliding window", "Random shuffle", "Binary heap only", "Topological sort"], correctOption: 0, points: 1 },
    { prompt: "Which structure is most suitable for implementing an LRU cache?", options: ["Stack only", "Queue only", "Hash map + doubly linked list", "Binary tree only"], correctOption: 2, points: 1 },
    { prompt: "What does a stable sort preserve?", options: ["Only unique values", "Relative order of equal keys", "Descending order", "Tree balance"], correctOption: 1, points: 1 },
    { prompt: "Which approach reduces repeated work by storing overlapping subproblem results?", options: ["Dynamic programming", "Backtracking only", "Hash collision", "Linear scan only"], correctOption: 0, points: 1 },
    { prompt: "Which graph algorithm finds shortest paths from one source with non-negative edge weights?", options: ["Dijkstra", "Kruskal", "Prim", "Floyd-Warshall only"], correctOption: 0, points: 1 },
  ],
  SQL: [
    { prompt: "Which clause filters rows before grouping?", options: ["HAVING", "WHERE", "ORDER BY", "LIMIT"], correctOption: 1, points: 1 },
    { prompt: "Which keyword removes duplicate rows from a SELECT result?", options: ["UNIQUE", "DISTINCT", "DEDUP", "GROUP"], correctOption: 1, points: 1 },
    { prompt: "Which index is usually useful for equality lookups on a column?", options: ["B-tree index", "Full table scan", "View only", "Trigger"], correctOption: 0, points: 1 },
    { prompt: "Which aggregate returns the number of rows?", options: ["SUM()", "COUNT()", "AVG()", "MAX()"], correctOption: 1, points: 1 },
    { prompt: "Which JOIN keeps every row from the left table?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"], correctOption: 1, points: 1 },
    { prompt: "Which clause filters grouped results after aggregation?", options: ["WHERE", "HAVING", "FROM", "SET"], correctOption: 1, points: 1 },
    { prompt: "What does a primary key guarantee?", options: ["Unique row identity", "Sorted rows", "No foreign keys", "No indexes"], correctOption: 0, points: 1 },
    { prompt: "Which isolation concept prevents reading another transaction's uncommitted changes?", options: ["Dirty read", "Read uncommitted", "Read committed", "No isolation"], correctOption: 2, points: 1 },
  ],
  JavaScript: [
    { prompt: "Which declaration is block-scoped and cannot be redeclared in the same scope?", options: ["var", "let", "function", "import*"], correctOption: 1, points: 1 },
    { prompt: "What does Promise.all() do when one promise rejects?", options: ["Waits forever", "Rejects the combined promise", "Converts rejection to null", "Retries automatically"], correctOption: 1, points: 1 },
    { prompt: "Which operator checks both value and type?", options: ["==", "=", "===", "!=="], correctOption: 2, points: 1 },
    { prompt: "A closure allows a function to access:", options: ["Only global variables", "Its lexical scope variables after the outer function returns", "Only DOM nodes", "Only class fields"], correctOption: 1, points: 1 },
    { prompt: "Which array method creates a new array by transforming each item?", options: ["map", "forEach", "find", "some"], correctOption: 0, points: 1 },
    { prompt: "What is the event loop responsible for?", options: ["Compiling TypeScript", "Coordinating asynchronous callbacks", "Encrypting requests", "Rendering CSS only"], correctOption: 1, points: 1 },
    { prompt: "Which value is falsy?", options: ["[]", "{}", "\"0\"", "0"], correctOption: 3, points: 1 },
    { prompt: "What does Object.freeze() do?", options: ["Deep-clones an object", "Prevents adding, deleting, or changing own properties", "Encrypts the object", "Makes all nested values immutable"], correctOption: 1, points: 1 },
  ],
  React: [
    { prompt: "Which hook stores local component state?", options: ["useEffect", "useMemo", "useState", "useRefetch"], correctOption: 2, points: 1 },
    { prompt: "What does React use keys for in lists?", options: ["CSS styling", "Stable element identity during reconciliation", "API authentication", "Database indexing"], correctOption: 1, points: 1 },
    { prompt: "Which hook is designed for side effects?", options: ["useEffect", "useId", "useState", "useMemo"], correctOption: 0, points: 1 },
    { prompt: "A controlled input gets its value from:", options: ["Component state/props", "Browser cache only", "CSS", "Service worker only"], correctOption: 0, points: 1 },
    { prompt: "Which hook memoizes a computed value?", options: ["useMemo", "useEffect", "useContext", "useReducer"], correctOption: 0, points: 1 },
    { prompt: "What is the purpose of React.lazy()?", options: ["Lazy-load a component", "Delay state updates forever", "Cache API secrets", "Disable hydration"], correctOption: 0, points: 1 },
    { prompt: "What problem does a context provider help solve?", options: ["Sharing values through a component tree without prop drilling", "SQL joins", "Binary search", "Image compression"], correctOption: 0, points: 1 },
    { prompt: "Why should state updates avoid mutating existing objects directly?", options: ["React relies on predictable state changes and reference comparisons", "The browser forbids objects", "CSS requires immutability", "It always crashes JavaScript"], correctOption: 0, points: 1 },
  ],
  Python: [
    { prompt: "Which collection type is immutable?", options: ["list", "dict", "set", "tuple"], correctOption: 3, points: 1 },
    { prompt: "Which keyword defines a function?", options: ["func", "def", "function", "lambda"], correctOption: 1, points: 1 },
    { prompt: "What does list comprehension primarily provide?", options: ["Compact list construction", "Database indexing", "Thread scheduling", "Type erasure"], correctOption: 0, points: 1 },
    { prompt: "Which structure provides average O(1) membership lookup by key?", options: ["dict", "list", "tuple", "range"], correctOption: 0, points: 1 },
    { prompt: "What is a generator useful for?", options: ["Lazy iteration", "CSS rendering", "SQL transactions", "Password hashing only"], correctOption: 0, points: 1 },
    { prompt: "Which symbol starts a comment in Python?", options: ["//", "#", "<!--", "--"], correctOption: 1, points: 1 },
    { prompt: "What does virtualenv isolate?", options: ["Python package environments", "GPU cores", "Network routes", "Browser cookies"], correctOption: 0, points: 1 },
    { prompt: "Which keyword is used to catch an exception?", options: ["except", "catch", "rescue", "handle"], correctOption: 0, points: 1 },
  ],
  "System Design": [
    { prompt: "Which component commonly distributes requests across multiple servers?", options: ["Load balancer", "Compiler", "Object store only", "DNS record only"], correctOption: 0, points: 1 },
    { prompt: "A cache is primarily used to:", options: ["Reduce repeated expensive reads", "Guarantee writes never fail", "Replace all databases", "Disable authentication"], correctOption: 0, points: 1 },
    { prompt: "Which property means a system continues operating despite some component failures?", options: ["Fault tolerance", "Normalization", "Encapsulation", "Serialization"], correctOption: 0, points: 1 },
    { prompt: "Which data store is often suited to high-volume key-value access?", options: ["Key-value database", "CSS file", "Image editor", "Build manifest"], correctOption: 0, points: 1 },
    { prompt: "What does horizontal scaling mean?", options: ["Adding more instances", "Increasing one server's CPU only", "Removing replicas", "Reducing storage"], correctOption: 0, points: 1 },
    { prompt: "What is a queue useful for in distributed systems?", options: ["Decoupling producers and consumers", "Rendering CSS", "Replacing TLS", "Compiling code"], correctOption: 0, points: 1 },
    { prompt: "Which strategy helps prevent one service from overwhelming another?", options: ["Backpressure", "Unbounded retries", "Global variables", "Disabling timeouts"], correctOption: 0, points: 1 },
    { prompt: "What does eventual consistency mean?", options: ["Replicas converge over time", "All writes are synchronous", "Reads never fail", "Data is never replicated"], correctOption: 0, points: 1 },
  ],
  APIs: [
    { prompt: "Which HTTP method is conventionally used to retrieve a resource?", options: ["GET", "POST", "PATCH", "DELETE"], correctOption: 0, points: 1 },
    { prompt: "Which status code usually indicates a successful creation?", options: ["200", "201", "204", "500"], correctOption: 1, points: 1 },
    { prompt: "What is idempotency?", options: ["Repeating an operation has the same intended effect as doing it once", "Encrypting payloads", "Compressing JSON", "Caching DNS"], correctOption: 0, points: 1 },
    { prompt: "Which header is commonly used for bearer-token authentication?", options: ["Authorization", "Location", "Allow", "Origin"], correctOption: 0, points: 1 },
    { prompt: "What does pagination help with?", options: ["Returning large result sets in manageable pages", "Encrypting requests", "Validating passwords", "Compiling TypeScript"], correctOption: 0, points: 1 },
    { prompt: "Which method is commonly used for partial updates?", options: ["PATCH", "TRACE", "HEAD", "OPTIONS"], correctOption: 0, points: 1 },
    { prompt: "What is a request timeout used for?", options: ["Bounding how long a caller waits", "Making retries infinite", "Hiding errors", "Disabling logging"], correctOption: 0, points: 1 },
    { prompt: "What is a rate limiter designed to protect?", options: ["System capacity from excessive request volume", "CSS layout", "Database schema names", "Source-code formatting"], correctOption: 0, points: 1 },
  ],
  Cloud: [
    { prompt: "What does autoscaling generally do?", options: ["Adjusts capacity based on demand", "Deletes all replicas", "Disables monitoring", "Encrypts source code"], correctOption: 0, points: 1 },
    { prompt: "Object storage is commonly used for:", options: ["Files and blobs", "CPU registers", "SQL joins", "Keyboard input"], correctOption: 0, points: 1 },
    { prompt: "What is a region in a cloud platform?", options: ["A geographic deployment area", "A JavaScript variable", "A database row", "A browser tab"], correctOption: 0, points: 1 },
    { prompt: "What is a health check commonly used for?", options: ["Detecting whether an instance is ready to serve traffic", "Sorting arrays", "Formatting JSON", "Compressing images"], correctOption: 0, points: 1 },
    { prompt: "Which pattern can isolate failures between services?", options: ["Circuit breaker", "Global singleton only", "Busy loop", "Infinite recursion"], correctOption: 0, points: 1 },
    { prompt: "What does infrastructure as code provide?", options: ["Versioned, repeatable infrastructure configuration", "Manual-only server changes", "UI animations", "Database triggers"], correctOption: 0, points: 1 },
    { prompt: "What is a secret manager used for?", options: ["Securely storing sensitive credentials", "Serving images", "Rendering React", "Sorting records"], correctOption: 0, points: 1 },
    { prompt: "Why use multiple availability zones?", options: ["Improve resilience to zone-level failures", "Reduce all network latency to zero", "Remove the need for backups", "Avoid authentication"], correctOption: 0, points: 1 },
  ],
  Testing: [
    { prompt: "What does a unit test normally isolate?", options: ["A small piece of logic", "The whole internet", "All production traffic", "The operating system kernel"], correctOption: 0, points: 1 },
    { prompt: "What is a regression test intended to catch?", options: ["Old behavior breaking after a change", "Low disk space only", "DNS expiry", "UI color preference"], correctOption: 0, points: 1 },
    { prompt: "What is a mock useful for?", options: ["Replacing a dependency with controlled behavior in a test", "Deploying servers", "Editing CSS", "Hashing passwords"], correctOption: 0, points: 1 },
    { prompt: "What does code coverage measure?", options: ["Which code paths were exercised by tests", "Server uptime", "Database size", "Network bandwidth"], correctOption: 0, points: 1 },
    { prompt: "Which test checks how components work together?", options: ["Integration test", "Syntax test", "Lint-only test", "Snapshot-only test"], correctOption: 0, points: 1 },
    { prompt: "A flaky test is one that:", options: ["Passes and fails unpredictably without relevant code changes", "Always fails", "Runs only in production", "Has no assertions"], correctOption: 0, points: 1 },
    { prompt: "What does a test fixture provide?", options: ["Known setup data/state for tests", "Cloud credentials", "CSS variables", "HTTP status codes"], correctOption: 0, points: 1 },
    { prompt: "Why test edge cases?", options: ["They reveal failures at input boundaries and unusual states", "They always improve latency", "They remove all bugs automatically", "They replace code review"], correctOption: 0, points: 1 },
  ],
  Debugging: [
    { prompt: "What is the first useful step when a bug is difficult to reproduce?", options: ["Capture exact reproduction conditions", "Delete the failing code", "Disable all tests", "Ignore logs"], correctOption: 0, points: 1 },
    { prompt: "Which tool is commonly used to inspect runtime values in browser code?", options: ["Debugger", "Package manager", "SQL index", "DNS resolver"], correctOption: 0, points: 1 },
    { prompt: "A stack trace is useful because it shows:", options: ["The call path leading to an error", "All database rows", "CSS specificity only", "User passwords"], correctOption: 0, points: 1 },
    { prompt: "What is a binary search strategy for debugging?", options: ["Narrow the suspected change set or execution path", "Search every file randomly", "Delete half the repository", "Disable logging"], correctOption: 0, points: 1 },
    { prompt: "Why add targeted logging around a failure?", options: ["To capture the state needed to reason about the failure", "To increase CPU forever", "To hide exceptions", "To avoid reproducing issues"], correctOption: 0, points: 1 },
    { prompt: "A regression is most likely introduced by:", options: ["A recent change that altered previous behavior", "A static logo", "An unrelated font file", "A browser bookmark"], correctOption: 0, points: 1 },
    { prompt: "What is a minimal reproduction?", options: ["The smallest setup that still demonstrates the bug", "A full production environment", "A UI mockup", "A copied database"], correctOption: 0, points: 1 },
    { prompt: "Why fix the root cause instead of only hiding symptoms?", options: ["The underlying failure can return under another path", "It always reduces code size", "It avoids testing", "It removes the need for monitoring"], correctOption: 0, points: 1 },
  ],
};

function virtualId(index: number) {
  return "virtual-" + index.toString(36).padStart(6, "0");
}

export function isVirtualAssessmentId(id: string) {
  return /^virtual-[0-9a-z]{6}$/.test(id);
}

function valuesForIndex(index: number) {
  const company = COMPANIES[index % COMPANIES.length];
  const career = CAREERS[Math.floor(index / COMPANIES.length) % CAREERS.length];
  const role = ROLES[Math.floor(index / (COMPANIES.length * CAREERS.length)) % ROLES.length];
  const difficulty = DIFFICULTIES[Math.floor(index / (COMPANIES.length * CAREERS.length * ROLES.length)) % DIFFICULTIES.length];
  const topic = TOPICS[Math.floor(index / (COMPANIES.length * CAREERS.length * ROLES.length * DIFFICULTIES.length)) % TOPICS.length];
  return { company, career, role, difficulty, topic };
}

export function getVirtualAssessment(index: number): VirtualAssessment {
  const { company, career, role, difficulty, topic } = valuesForIndex(index);
  const bank = QUESTION_BANKS[topic];
  const questions = Array.from({ length: 8 }, (_, qIndex) => {
    const source = bank[(index * 3 + qIndex) % bank.length];
    return {
      id: String(qIndex),
      prompt: `In this original Dhyavora ${company} preparation simulation (#${index + 1}), ${source.prompt}`,
      options: [...source.options],
      correctOption: source.correctOption,
      points: source.points,
    };
  });
  return {
    _id: virtualId(index),
    title: `${company} · ${role} · ${topic} · ${difficulty} — Simulation #${String(index + 1).padStart(6, "0")}`,
    data: {
      description: `Original Dhyavora preparation simulation oriented around ${company}, ${career}, and ${role}. Not a leaked or copied company test.`,
      durationMinutes: difficulty === "Easy" ? 12 : difficulty === "Medium" ? 18 : difficulty === "Hard" ? 25 : 22,
      negativeMark: difficulty === "Hard" ? 0.25 : 0,
      career,
      company,
      role,
      difficulty,
      topics: [topic],
      assessmentType: "MCQ",
      active: true,
      virtual: true,
      questions,
    },
  };
}

export function virtualAssessmentMeta(index: number) {
  const item = getVirtualAssessment(index);
  const { correctOption: _hidden, ...questionsWithoutAnswers } = item.data.questions.reduce(
    (acc, question, qIndex) => ({ ...acc, [qIndex]: question.correctOption }),
    {} as Record<number, number>,
  );
  void correctOption;
  void questionsWithoutAnswers;
  return {
    ...item,
    data: {
      ...item.data,
      questions: item.data.questions.map(({ correctOption: _correctOption, ...safe }) => safe),
    },
  };
}

export function matchesVirtualAssessment(
  index: number,
  query: { search?: string; company?: string; career?: string; role?: string; difficulty?: string; topic?: string },
) {
  const item = getVirtualAssessment(index);
  const haystack = [
    item.title,
    item.data.description,
    item.data.company,
    item.data.career,
    item.data.role,
    ...(item.data.topics ?? []),
  ].join(" ").toLowerCase();
  const match = (value: string | undefined, actual: string | undefined) => !value || value.toLowerCase() === actual?.toLowerCase();
  return Boolean(
    (!query.search || haystack.includes(query.search.toLowerCase())) &&
    match(query.company, item.data.company) &&
    match(query.career, item.data.career) &&
    match(query.role, item.data.role) &&
    match(query.difficulty, item.data.difficulty) &&
    match(query.topic, item.data.topics?.[0]),
  );
}

export function virtualIndexFromId(id: string) {
  if (!isVirtualAssessmentId(id)) return null;
  return Number.parseInt(id.slice("virtual-".length), 36);
}

export function listVirtualAssessments(
  query: { search?: string; company?: string; career?: string; role?: string; difficulty?: string; topic?: string },
  offset: number,
  limit: number,
) {
  const rows: VirtualAssessment[] = [];
  let matched = 0;
  for (let index = 0; index < VIRTUAL_ASSESSMENT_COUNT && rows.length < limit; index += 1) {
    if (!matchesVirtualAssessment(index, query)) continue;
    if (matched++ < offset) continue;
    rows.push(getVirtualAssessment(index));
  }
  let total = matched;
  if (rows.length === limit) {
    for (let index = 0; index < VIRTUAL_ASSESSMENT_COUNT; index += 1) {
      if (matchesVirtualAssessment(index, query)) total += index === 0 ? 0 : 0;
    }
    total = 0;
    for (let index = 0; index < VIRTUAL_ASSESSMENT_COUNT; index += 1) if (matchesVirtualAssessment(index, query)) total += 1;
  }
  return { rows, total };
}
