import { afterAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const usernames = [`it_member_${suffix}`, `it_reviewer_${suffix}`];

async function createUser(username: string, email: string) {
  return db.user.create({
    data: {
      username,
      email,
      passwordHash: "argon2id-placeholder-for-integration-test",
      dateOfBirth: new Date("2000-01-01"),
      profile: { create: { displayName: `Integration ${username}` } },
    },
  });
}

afterAll(async () => {
  await db.user.deleteMany({ where: { username: { in: usernames } } });
  await db.$disconnect();
});

describe("database invariants", () => {
  it("persists accounts with profiles and enforces unique identities", async () => {
    const member = await createUser(usernames[0]!, `it_member_${suffix}@example.test`);
    expect(member.id).toBeTruthy();
    expect(member.status).toBe("ACTIVE");
    expect(member.role).toBe("USER");

    const withProfile = await db.user.findUnique({ where: { id: member.id }, include: { profile: true } });
    expect(withProfile?.profile?.displayName).toBe(`Integration ${usernames[0]}`);

    await expect(createUser(usernames[0]!, `other_${suffix}@example.test`)).rejects.toMatchObject({
      code: "P2002",
    });
    await expect(createUser(`other_${suffix}`, `it_member_${suffix}@example.test`)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError
    );
  });

  it("links reports to reporters and reviewers", async () => {
    const reporter = await db.user.findUniqueOrThrow({ where: { username: usernames[0]! } });
    const reviewer = await createUser(usernames[1]!, `it_reviewer_${suffix}@example.test`);

    const report = await db.report.create({
      data: {
        reporterId: reporter.id,
        targetType: "POST",
        targetId: `missing_${suffix}`,
        reason: "Spam or misleading content",
        details: "Integration test report.",
      },
    });
    expect(report.status).toBe("PENDING");

    const resolved = await db.report.update({
      where: { id: report.id },
      data: {
        status: "RESOLVED",
        resolutionNote: "Handled by integration test.",
        reviewedById: reviewer.id,
      },
      include: { reporter: { select: { username: true } }, reviewer: { select: { username: true } } },
    });
    expect(resolved.reporter.username).toBe(usernames[0]);
    expect(resolved.reviewer?.username).toBe(usernames[1]);
  });

  it("cascades reports when the reporter account is removed", async () => {
    const reporter = await db.user.findUniqueOrThrow({ where: { username: usernames[0]! } });
    const before = await db.report.count({ where: { reporterId: reporter.id } });
    expect(before).toBeGreaterThan(0);

    await db.user.delete({ where: { id: reporter.id } });
    await db.user.deleteMany({ where: { username: usernames[1]! } });

    expect(await db.report.count({ where: { reporterId: reporter.id } })).toBe(0);
    expect(await db.user.count({ where: { username: { in: usernames } } })).toBe(0);
  });
});
