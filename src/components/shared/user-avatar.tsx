import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  username,
  displayName,
  avatarUrl,
  className,
}: {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  className?: string;
}) {
  const label = displayName || username;
  return (
    <Avatar className={cn("size-8", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={`${label} avatar`} /> : null}
      <AvatarFallback aria-label={`${label} avatar`}>
        {label.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
