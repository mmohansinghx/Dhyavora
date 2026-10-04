import mongoose, { Schema, type Model } from "mongoose";

const recordSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  data: { type: Schema.Types.Mixed, required: true, default: {} },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw", versionKey: false });
recordSchema.index({ userId: 1, updatedAt: -1 });
recordSchema.index({ "data.providerEventId": 1 }, { unique: true, partialFilterExpression: { "data.providerEventId": { $type: "string" } } });

const collectionByKind: Record<string, string> = {
  profile: "users", career: "careers", roadmap: "roadmaps", assessment: "assessments", "assessment-attempt": "assessmentAttempts",
  question: "questions", "interview-session": "interviewSessions", project: "projects", "learning-resource": "learningResources",
  "resource-progress": "resourceProgress", "resume-document": "resumeDocuments", opportunity: "opportunities", application: "applications",
  notification: "notifications", analytics: "analytics", mentor: "mentors", "mentor-session": "mentorSessions", "community-post": "communityPosts",
  "community-comment": "communityComments", subscription: "subscriptions", payment: "payments", "audit-log": "auditLogs",
  "github-connection": "githubConnections", "copilot-session": "copilotSessions",
  "community-report": "communityReports", "user-block": "userBlocks",
};

const cache = new Map<string, Model<any>>();
export function recordModel(kind: string): Model<any> {
  const collection = collectionByKind[kind];
  if (!collection) throw new Error("Unknown resource kind: " + kind);
  const modelName = "Dhyavora_" + kind.replace(/-/g, "_");
  if (!cache.has(kind)) {
    const schema = recordSchema.clone();
    if (kind === "career" || kind === "assessment") {
      schema.index({ userId: 1, "data.seedKey": 1 }, { unique: true, partialFilterExpression: { "data.seedKey": { $type: "string" } } });
    }
    if (kind === "profile") schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
    if (kind === "github-connection") schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
    cache.set(kind, (mongoose.models[modelName] as Model<any> | undefined) ?? mongoose.model(modelName, schema, collection));
  }
  return cache.get(kind)!;
}

export const RESOURCE_KINDS = Object.keys(collectionByKind);
