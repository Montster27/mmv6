const allowlistEnv =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST ??
  process.env.ADMIN_EMAIL_ALLOWLIST ??
  "";

const adminEmails = allowlistEnv
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(email.toLowerCase());
}

export function adminAllowlistDescription() {
  return adminEmails.join(", ");
}
