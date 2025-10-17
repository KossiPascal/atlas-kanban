import { AppTitle, AppBackendUrl, AppFirebaseConfig } from "../../env";

// import { version } from '../../package.json';
export const environment = {
  production: false,
  title: AppTitle,
  firebaseConfig: { ...AppFirebaseConfig },
  backendUrl: AppBackendUrl()
};