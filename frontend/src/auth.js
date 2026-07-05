/**
 * Neon Auth client for the Bawar Star Cash Book frontend.
 *
 * Uses @neondatabase/neon-js (Better Auth) to handle email/password auth
 * through the Neon-managed auth service.
 *
 * The VITE_NEON_AUTH_URL must be set to the real Neon Auth Base URL:
 *   https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth
 *
 * If the variable is missing or set to the placeholder "provisioning",
 * Neon Auth will be disabled and the standard login screen is shown instead.
 */
import { createAuthClient } from '@neondatabase/neon-js/auth';

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || '';

/**
 * True when Neon Auth has been provisioned and configured.
 * Used to conditionally render the Neon Auth sign-in button.
 */
export const isNeonAuthEnabled =
  Boolean(NEON_AUTH_URL) && NEON_AUTH_URL !== 'provisioning';

/**
 * The Better Auth client.  Only instantiate it when auth is enabled so that
 * we don't make unnecessary network calls in dev environments that haven't
 * set up Neon Auth.
 */
export const neonAuthClient = isNeonAuthEnabled
  ? createAuthClient(NEON_AUTH_URL)
  : null;

/**
 * Sign in with email + password through Neon Auth.
 * Returns { data, error }.
 */
export async function signInWithNeonAuth(email, password) {
  if (!neonAuthClient) {
    return { data: null, error: new Error('Neon Auth is not configured') };
  }
  return neonAuthClient.signIn.email({ email, password });
}

/**
 * Sign up with email + password through Neon Auth.
 * Returns { data, error }.
 */
export async function signUpWithNeonAuth(email, password, name) {
  if (!neonAuthClient) {
    return { data: null, error: new Error('Neon Auth is not configured') };
  }
  return neonAuthClient.signUp.email({ email, password, name: name || email.split('@')[0] });
}

/**
 * Get the current Neon Auth session JWT string, or null if not signed in.
 * This token is what we send to the backend's /api/auth/neon-login endpoint.
 */
export async function getNeonAuthToken() {
  if (!neonAuthClient) return null;
  try {
    const result = await neonAuthClient.getSession();
    return result?.data?.session?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Sign out of Neon Auth.
 */
export async function signOutNeonAuth() {
  if (!neonAuthClient) return;
  try {
    await neonAuthClient.signOut();
  } catch {
    // Ignore signout errors
  }
}
