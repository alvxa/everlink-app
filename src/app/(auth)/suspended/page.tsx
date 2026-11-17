import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="mesh-bg flex min-h-dvh items-center justify-center bg-surface-2 px-4">
      <div className="surface-card w-full max-w-md p-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Account suspended</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
          Your Everlink account is currently suspended. If you believe this was a mistake, contact our moderation team and we
          will review it.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Contact support
          </Link>
          <Link href="/" className="text-[13px] font-medium text-ink-muted hover:text-ink">
            Back to everlink home
          </Link>
        </div>
      </div>
    </div>
  );
}
