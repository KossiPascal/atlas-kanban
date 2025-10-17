# Backend (NestJS)

- Place your Firebase serviceAccountKey.json at backend/serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT_PATH env var.
- Install & run:
  npm install
  npm run start:dev

- The API endpoints are protected: include Authorization: Bearer <idToken> header (Firebase ID token)
- WebSocket emits 'task:update' events on changes
