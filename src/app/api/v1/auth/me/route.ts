import { json, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  return withApi(async () => {
    const user = await getCurrentUser();
    if (!user) return json({ user: null });
    return json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: Boolean(user.emailVerifiedAt),
        onboarded: Boolean(user.onboardedAt),
        twoFactorEnabled: Boolean(user.twoFactor?.enabled),
        profile: user.profile,
        settings: user.settings,
      },
    });
  });
}
