import "server-only";
import { ApiError } from "./api";
import { getCurrentUser, isAdmin, isStaff, type SessionUser } from "./auth";

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "You must be signed in to do that.");
  return user;
}

export async function requireVerifiedApiUser(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!user.emailVerifiedAt) {
    throw new ApiError(403, "EMAIL_UNVERIFIED", "Verify your email address to unlock posting, messaging and communities.");
  }
  return user;
}

export async function requireStaffApi(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!isStaff(user)) throw new ApiError(403, "FORBIDDEN", "Staff access required.");
  return user;
}

export async function requireAdminApi(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!isAdmin(user)) throw new ApiError(403, "FORBIDDEN", "Administrator access required.");
  return user;
}

export function displayNameOf(user: { username: string; profile?: { displayName?: string | null } | null }) {
  return user.profile?.displayName || user.username;
}
