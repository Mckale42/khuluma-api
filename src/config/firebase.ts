/**
 * Firebase Admin initialisation — used to verify Google-SSO ID tokens the
 * Android app sends. The service-account key lives only on the server.
 */
import admin from 'firebase-admin';
import { env } from './env';

let initialised = false;

export function getFirebaseAdmin(): typeof admin | null {
  if (env.authDevBypass) return null; // dev/testing: no Firebase needed
  if (!initialised) {
    if (!env.firebaseServiceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not set (and AUTH_DEV_BYPASS is false).');
    }
    const serviceAccount = JSON.parse(env.firebaseServiceAccount);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialised = true;
  }
  return admin;
}
