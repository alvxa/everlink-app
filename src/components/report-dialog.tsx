"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Textarea, FieldError } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel = "content",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: string;
  targetId: string;
  targetLabel?: string;
}) {
  const [reason, setReason] = React.useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/v1/reports", {
        method: "POST",
        json: { targetType, targetId, reason, details },
      });
      toast({ title: "Report submitted", description: "Our moderation team will review this soon.", variant: "success" });
      setDetails("");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Report ${targetLabel}`} description="Reports are private. The reported person will not be told who reported them.">
      <form onSubmit={submit} className="px-5 py-4">
        <Label htmlFor="report-reason">Why are you reporting this?</Label>
        <select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-electric/60 focus:ring-4 focus:ring-electric/10"
        >
          {REPORT_REASONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="mt-4">
          <Label htmlFor="report-details">Anything else we should know? (optional)</Label>
          <Textarea
            id="report-details"
            rows={4}
            maxLength={2000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Add context for moderators..."
          />
        </div>
        <FieldError>{error}</FieldError>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            <Flag className="h-4 w-4" /> Submit report
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
