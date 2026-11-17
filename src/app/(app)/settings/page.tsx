import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [settings, interests, languages, twoFactor] = await Promise.all([
    db.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    db.userInterest.findMany({ where: { userId: user.id }, select: { name: true }, orderBy: { name: "asc" } }),
    db.userLanguage.findMany({ where: { userId: user.id }, select: { code: true } }),
    db.twoFactor.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <SettingsScreen
      username={user.username}
      email={user.email}
      profile={{
        displayName: user.profile?.displayName || user.username,
        bio: user.profile?.bio ?? "",
        avatarUrl: user.profile?.avatarUrl ?? null,
        coverUrl: user.profile?.coverUrl ?? null,
        countryCode: user.profile?.countryCode ?? null,
        website: user.profile?.website ?? null,
        pronouns: user.profile?.pronouns ?? null,
      }}
      settings={{
        discoverable: settings.discoverable,
        showCountry: settings.showCountry,
        showOnlineStatus: settings.showOnlineStatus,
        allowRandomConnect: settings.allowRandomConnect,
        allowGroupInvites: settings.allowGroupInvites,
        messagePrivacy: settings.messagePrivacy,
        connectTopics: settings.connectTopics,
        connectLanguage: settings.connectLanguage,
        emailNotifications: settings.emailNotifications,
        notifyFollows: settings.notifyFollows,
        notifyLikes: settings.notifyLikes,
        notifyComments: settings.notifyComments,
        notifyMessages: settings.notifyMessages,
        notifyCommunities: settings.notifyCommunities,
        notifyLive: settings.notifyLive,
      }}
      interests={interests.map((item) => item.name)}
      languages={languages.map((item) => item.code)}
      twoFactorEnabled={Boolean(twoFactor?.enabled)}
    />
  );
}
