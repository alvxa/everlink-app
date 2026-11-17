"use client";

import * as React from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";

export function FollowButton({
  username,
  initialFollowing,
  isSelf,
  size = "sm",
}: {
  username: string;
  initialFollowing?: boolean;
  isSelf?: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = React.useState(Boolean(initialFollowing));
  const [pending, setPending] = React.useState(false);

  if (isSelf) return null;

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setPending(true);
    try {
      const result = await apiFetch<{ following: boolean }>("/api/v1/follows", {
        method: following ? "DELETE" : "POST",
        json: { username },
      });
      setFollowing(result.following);
    } catch (error) {
      toast({ title: "Could not update follow", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      onClick={toggle}
      loading={pending}
      aria-pressed={following}
    >
      {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
