import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getComments, getPostById } from "@/lib/queries";
import { PostCard } from "@/components/feed/post-card";
import { Comments } from "@/components/feed/comments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id, null);
  return {
    title: post ? `${post.author.displayName} on Everlink` : "Post",
    description: post?.body.slice(0, 160) || "A post on Everlink.",
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const [post, comments] = await Promise.all([getPostById(id, user.id), getComments(id, user.id)]);
  if (!post) notFound();

  const viewer = {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };

  return (
    <div className="space-y-4 px-4 pb-8 pt-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </Link>
      </div>
      <PostCard post={post} viewer={viewer} detail />
      <Comments postId={post.id} initialComments={comments} viewer={viewer} initialCount={post.counts.comments} />
    </div>
  );
}
