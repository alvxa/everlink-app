import Link from "next/link";

const TOKEN = /(#[\p{L}\p{N}_]+|@[a-zA-Z0-9_]{3,30}|https?:\/\/[^\s<]+)/gu;

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <p className={className ?? "whitespace-pre-wrap break-words text-[15px] leading-6 text-ink"}>
      {parts.map((part, index) => {
        if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link key={index} href={`/explore?hashtag=${encodeURIComponent(tag)}`} className="font-medium text-brand hover:underline">
              {part}
            </Link>
          );
        }
        if (/^@[a-zA-Z0-9_]{3,30}$/.test(part)) {
          return (
            <Link key={index} href={`/profile/${part.slice(1).toLowerCase()}`} className="font-medium text-brand hover:underline">
              {part}
            </Link>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-ocean underline decoration-ocean/30 underline-offset-2 hover:decoration-ocean"
            >
              {part.length > 60 ? `${part.slice(0, 57)}...` : part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
