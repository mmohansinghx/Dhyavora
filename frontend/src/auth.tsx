import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { firebaseWebConfigured, webEnv } from "./env";

type AuthValue = { user: User | null; loading: boolean; configured: boolean; signIn(email: string, password: string): Promise<void>; signUp(email: string, password: string): Promise<void>; logOut(): Promise<void> };
const AuthContext = createContext<AuthValue | undefined>(undefined);
let firebaseApp: FirebaseApp | undefined;
if (firebaseWebConfigured) firebaseApp = initializeApp({ apiKey: webEnv.VITE_FIREBASE_API_KEY, authDomain: webEnv.VITE_FIREBASE_AUTH_DOMAIN, projectId: webEnv.VITE_FIREBASE_PROJECT_ID, storageBucket: webEnv.VITE_FIREBASE_STORAGE_BUCKET, appId: webEnv.VITE_FIREBASE_APP_ID });
const auth = firebaseApp ? getAuth(firebaseApp) : undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseWebConfigured);
  useEffect(() => auth ? onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false); }) : undefined, []);
  const value = useMemo<AuthValue>(() => ({
    user, loading, configured: firebaseWebConfigured,
    signIn: async (email, password) => { if (!auth) throw new Error("Sign-in is temporarily unavailable. Please try again shortly."); await signInWithEmailAndPassword(auth, email, password); },
    signUp: async (email, password) => { if (!auth) throw new Error("Account creation is temporarily unavailable. Please try again shortly."); await createUserWithEmailAndPassword(auth, email, password); },
    logOut: async () => { if (auth) await signOut(auth); },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider is missing."); return value; }
