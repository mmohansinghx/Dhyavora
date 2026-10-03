import { firebaseStorage } from "../../config/firebase.js";
import { env } from "../../config/env.js";

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

export function resumeStorageProvider(): PrivateObjectStorageProvider | undefined {
  return firebaseStorage && env.FIREBASE_STORAGE_BUCKET ? new FirebaseAdminStorageAdapter(env.FIREBASE_STORAGE_BUCKET) : undefined;
}
