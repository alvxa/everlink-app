"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageCircle, MoreHorizontal, Pencil, ShieldBan, UserCheck, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/report-dialog";
import { apiFetch, errorMessage } from "@/lib/client";

export function ProfileActions({
  username,
  userId,
  isSelf,
  isFollowing,
  friendStatus,
  friendDirection,
  blocked,
  blockedMe,
}: {
  username: string;
  userId: string;
  isSelf: boolean;
  isFollowing: boolean;
  friendStatus: string | null;
  friendDirection: "incoming" | "outgoing" | null;
  blocked: boolean;
  blockedMe: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = React.useState(isFollowing);
  const [friend, setFriend] = React.useState(friendStatus);
  const [isBlocked, setIsBlocked] = React.useState(blocked);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);

  if (isSelf) {
    return (
      <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Pencil className="h-4 w-4" /> Edit profile
      </Link>
    );
  }

  async function toggleFollow() {
    setBusy("follow");
    try {
      const result = await apiFetch<{ following: boolean }>("/api/v1/follows", {
        method: following ? "DELETE" : "POST",
        json: { username },
      });
      setFollowing(result.following);
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update follow", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function addFriend() {
    setBusy("friend");
    try {
      await apiFetch("/api/v1/friends", { method: "POST", json: { username } });
      setFriend("PENDING");
      toast({ title: "Friend request sent", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not send request", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function respond(action: "ACCEPT" | "DECLINE") {
    setBusy("friend");
    try {
      const incoming = await apiFetch<{ requests: { id: string; user: { id: string } }[] }>("/api/v1/friends?type=incoming");
      const request = incoming.requests.find((item) => item.user.id === userId);
      if (!request) throw new Error("That request is no longer available.");
      await apiFetch("/api/v1/friends", { method: "PATCH", json: { requestId: request.id, action } });
      setFriend(action === "ACCEPT" ? "ACCEPTED" : null);
      toast({ title: action === "ACCEPT" ? "Friend request accepted" : "Request declined", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not respond", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function message() {
    setBusy("message");
    try {
      const data = await apiFetch<{ conversationId: string }>("/api/v1/conversations", {
        method: "POST",
        json: { type: "DIRECT", usernames: [username], memberIds: [] },
      });
      router.push(`/messages/${data.conversationId}`);
    } catch (error) {
      toast({ title: "Could not open chat", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock() {
    if (!isBlocked && !confirm(`Block @${username}? They will not be able to message or find you.`)) return;
    setBusy("block");
    try {
      await apiFetch("/api/v1/blocks", { method: isBlocked ? "DELETE" : "POST", json: { username } });
      setIsBlocked(!isBlocked);
      toast({ title: isBlocked ? "Unblocked" : "Blocked", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update block", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (blockedMe) {
    return (
      <p className="rounded-xl bg-surface-3 px-3 py-2 text-[12.5px] text-ink-muted">
        This account is not available.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isBlocked && (
        <Button variant={following ? "outline" : "default"} size="sm" onClick={toggleFollow} loading={busy === "follow"}>
          {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {following ? "Following" : "Follow"}
        </Button>
      )}

      {!isBlocked && friendStatus !== "ACCEPTED" && (
        friendDirection === "incoming" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="mint" onClick={() => respond("ACCEPT")} loading={busy === "friend"}>
              <UserCheck className="h-4 w-4" /> Accept request
            </Button>
            <Button size="sm" variant="ghost" onClick={() => respond("DECLINE")} disabled={busy === "friend"}>
              Decline
            </Button>
          </div>
        ) : friendStatus === "PENDING" ? (
          <Button size="sm" variant="secondary" disabled>
            <Loader2 className="h-4 w-4" /> Request pending
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={addFriend} loading={busy === "friend"}>
            <UserPlus className="h-4 w-4" /> Add friend
          </Button>
        )
      )}
      {friendStatus === "ACCEPTED" && (
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-mint/15 px-3 py-2 text-[12.5px] font-semibold text-mint">
          <UserCheck className="h-4 w-4" /> Friends
        </span>
      )}

      {!isBlocked && (
        <Button size="sm" variant="outline" onClick={message} loading={busy === "message"}>
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
      )}

      <Dropdown
        trigger={
          <Button size="sm" variant="ghost" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        {(close) => (
          <div className="w-48">
            <MenuItem onClick={() => { close(); setReportOpen(true); }}>Report account</MenuItem>
            <MenuItem danger onClick={() => { close(); void toggleBlock(); }}>
              <ShieldBan className="h-4 w-4" /> {isBlocked ? "Unblock" : "Block"} @{username}
            </MenuItem>
          </div>
        )}
      </Dropdown>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="USER" targetId={userId} targetLabel="account" />
    </div>
  );
}
