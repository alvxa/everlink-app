"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radio, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";
import { COUNTRIES } from "@/lib/countries";

export type LiveCommunityOption = { id: string; name: string };

export function CreateLiveRoomDialog({
  communities,
  defaultCountryCode,
}: {
  communities: LiveCommunityOption[];
  defaultCountryCode: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    type: "PUBLIC" as "PUBLIC" | "PRIVATE",
    topic: "",
    countryCode: defaultCountryCode ?? "",
    communityId: "",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (form.title.trim().length < 3) return setError("Give your room a name.");
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ room: { id: string } }>("/api/v1/live", {
        method: "POST",
        json: {
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          topic: form.topic.trim() || null,
          countryCode: form.countryCode || null,
          communityId: form.communityId || null,
        },
      });
      toast({ title: "Room is live", variant: "success" });
      setOpen(false);
      router.push(`/live/${data.room.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Radio className="h-4 w-4" /> Go live
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Start a live room"
        description="Audio and video over peer-to-peer WebRTC. Your browser will ask for microphone and camera access."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="create-live" type="submit" loading={pending}>
              Start room
            </Button>
          </div>
        }
      >
        <form id="create-live" onSubmit={submit} className="space-y-3 px-5 py-4">
          <div>
            <Label htmlFor="live-title">Room title</Label>
            <Input
              id="live-title"
              value={form.title}
              maxLength={100}
              autoFocus
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Late night language exchange"
            />
          </div>
          <div>
            <Label htmlFor="live-description">Description</Label>
            <Textarea
              id="live-description"
              rows={3}
              maxLength={1000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What is this room about?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="live-type">Privacy</Label>
              <Select
                id="live-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })}
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private (invite only)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="live-topic">Topic</Label>
              <Input
                id="live-topic"
                value={form.topic}
                maxLength={60}
                onChange={(event) => setForm({ ...form, topic: event.target.value })}
                placeholder="Travel, music..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="live-country">Country</Label>
              <Select
                id="live-country"
                value={form.countryCode}
                onChange={(event) => setForm({ ...form, countryCode: event.target.value })}
              >
                <option value="">Global</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="live-community">Community</Label>
              <Select
                id="live-community"
                value={form.communityId}
                onChange={(event) => setForm({ ...form, communityId: event.target.value })}
              >
                <option value="">No community</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

export function InviteToLiveDialog({ roomId }: { roomId: string }) {
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/live/${roomId}`, { method: "PATCH", json: { action: "invite", username: username.trim() } });
      toast({ title: "Invitation sent", variant: "success" });
      setUsername("");
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Invite
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Invite to this room"
        description="They will get a live invitation notification."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="invite-live" type="submit" loading={pending}>
              Send invite
            </Button>
          </div>
        }
      >
        <form id="invite-live" onSubmit={submit} className="space-y-3 px-5 py-4">
          <div>
            <Label htmlFor="live-invite-username">Username</Label>
            <Input
              id="live-invite-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@username"
              autoFocus
            />
          </div>
          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}
