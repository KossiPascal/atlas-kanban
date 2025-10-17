import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// ✅ __dirname est automatiquement défini en CommonJS
export const SRC_FOLDER = __dirname;
export const API_FOLDER = path.dirname(SRC_FOLDER);
export const PROJECT_FOLDER = path.dirname(API_FOLDER);
export const PROJECT_PARENT_FOLDER = path.dirname(PROJECT_FOLDER);

dotenv.config({ override: true });

if (process.env.NODE_ENV !== 'production' || process.env.IS_DOCKER_RUNNING !== 'true') {
    // ✅ Charger les .env possibles (du plus proche au plus haut)
    const envPaths = [
        path.join(SRC_FOLDER, '.env'),
        path.join(API_FOLDER, '.env'),
        path.join(PROJECT_FOLDER, '.env'),
        path.join(PROJECT_PARENT_FOLDER, '.env'),
    ];

    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath, override: true });
            // console.log(`✅ .env loaded from ${envPath}`);
        } else {
            // console.warn(`⚠️ .env not found at ${envPath}`);
        }
    }
}


// ✅ Exporter toutes les variables d’environnement
export const ENV = {
    PORT: process.env.PORT,
    FIREBASE_APP_NAME: process.env.FIREBASE_APP_NAME || '[DEFAULT]',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,

    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
};
