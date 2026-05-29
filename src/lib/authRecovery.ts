/**
 * Storage key used to flag that the current session originated from a password-recovery
 * link. Set when Supabase fires `PASSWORD_RECOVERY` (or a session lands on /reset-password),
 * cleared on sign-out. Lets the reset-password flow distinguish a recovery session from a
 * normal authenticated session.
 */
export const PASSWORD_RECOVERY_STORAGE_KEY = "cornerstone.passwordRecovery";
