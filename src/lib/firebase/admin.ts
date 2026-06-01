import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

let app: App;
let db: Firestore;
let storageBucket: Bucket;

function getAdminApp(): App {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
  return app;
}

export function getAdminDb(): Firestore {
  if (!db) {
    getAdminApp();
    db = getFirestore();
  }
  return db;
}

export function getAdminStorage(): Bucket {
  if (!storageBucket) {
    getAdminApp();
    storageBucket = getStorage().bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    );
  }
  return storageBucket;
}
