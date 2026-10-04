import { firebaseStorage } from "../../config/firebase.js";
import { env, firebaseAdminConfigured } from "../../config/env.js";
import mongoose from "mongoose";

export interface PrivateObjectStorageProvider {
  upload(path: string, content: Buffer, contentType: string, ownerUid: string): Promise<void>;
  download(path: string): Promise<Buffer>;
}

export class FirebaseAdminStorageAdapter implements PrivateObjectStorageProvider {
  constructor(private readonly bucketName: string) {}
  async upload(path: string, content: Buffer, contentType: string, ownerUid: string) {
    await firebaseStorage!.bucket(this.bucketName).file(path).save(content, { resumable: false, metadata: { contentType, metadata: { ownerUid } } });
  }
  async download(path: string) {
    const [contents] = await firebaseStorage!.bucket(this.bucketName).file(path).download();
    return contents;
  }
}

export class MongoGridFsStorageAdapter implements PrivateObjectStorageProvider {
  private bucket() {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB is not connected.");
    return new mongoose.mongo.GridFSBucket(db, { bucketName: "dhyavora_resume_files" });
  }

  async upload(path: string, content: Buffer, contentType: string, ownerUid: string) {
    const stream = this.bucket().openUploadStream(path, { contentType, metadata: { ownerUid } });
    const completed = new Promise<void>((resolve, reject) => {
      stream.once("finish", resolve);
      stream.once("error", reject);
    });
    stream.end(content);
    await completed;
  }

  async download(path: string) {
    const stream = this.bucket().openDownloadStreamByName(path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
}

export function resumeStorageProvider(): PrivateObjectStorageProvider | undefined {
  if (firebaseAdminConfigured() && firebaseStorage && env.FIREBASE_STORAGE_BUCKET) return new FirebaseAdminStorageAdapter(env.FIREBASE_STORAGE_BUCKET);
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) return new MongoGridFsStorageAdapter();
  return undefined;
}

export function resumeStorageStatus() {
  if (firebaseAdminConfigured() && firebaseStorage && env.FIREBASE_STORAGE_BUCKET) return { state: "CONNECTED", provider: "firebase" } as const;
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) return { state: "CONNECTED", provider: "mongodb-gridfs" } as const;
  return { state: "NOT_CONFIGURED", provider: "none" } as const;
}
