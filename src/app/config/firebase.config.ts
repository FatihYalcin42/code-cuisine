declare global {
  interface Window {
    __CODE_CUISINE_FIREBASE__?: Partial<FirebaseWebConfig>;
  }
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const EMPTY_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export function getFirebaseConfig(): FirebaseWebConfig {
  if (typeof window !== 'undefined' && window.__CODE_CUISINE_FIREBASE__) {
    return {
      ...EMPTY_FIREBASE_CONFIG,
      ...window.__CODE_CUISINE_FIREBASE__,
    };
  }

  return EMPTY_FIREBASE_CONFIG;
}

export function hasFirebaseConfig(config: FirebaseWebConfig): boolean {
  return Object.values(config).every((value) => value.trim().length > 0);
}
