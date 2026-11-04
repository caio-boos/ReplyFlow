import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isLocale, type Locale } from "./config";

const USER_SETTINGS_COLLECTION = "userSettings";

export async function getUserLocale(uid: string): Promise<Locale | null> {
  try {
    const snap = await getAdminDb().collection(USER_SETTINGS_COLLECTION).doc(uid).get();
    const value = snap.data()?.locale;
    return isLocale(value) ? value : null;
  } catch (err) {
    console.error("[locale] failed to read preference", err);
    return null;
  }
}

export async function saveUserLocale(uid: string, locale: Locale): Promise<void> {
  try {
    await getAdminDb()
      .collection(USER_SETTINGS_COLLECTION)
      .doc(uid)
      .set({ locale, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error("[locale] failed to persist preference", err);
  }
}
