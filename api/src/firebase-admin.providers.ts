import * as admin from 'firebase-admin';
import { Provider } from '@nestjs/common';
import { getApps, getApp } from 'firebase-admin/app';
import { ENV } from './env';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

const { FIREBASE_APP_NAME, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL, FIREBASE_SERVICE_ACCOUNT_PATH } = ENV

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: () => {
    const appName = FIREBASE_APP_NAME;

    // 🔹 Si une instance existe déjà, la réutiliser
    // if (getApps().length > 0) return getApp();

    if (getApps().find(app => app.name === appName)) {
      return getApp(appName);
    }

    // 🔹 Sinon initialiser une nouvelle app
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      }),
      databaseURL: FIREBASE_DATABASE_URL, // optionnel
    }, appName);
    // const serviceAccountPath = FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
    // const serviceAccount = require(serviceAccountPath);
    // return admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount),
    // });
  }
};
