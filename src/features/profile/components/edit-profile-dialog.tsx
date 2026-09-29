"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Image as ImageIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProfileHeader } from "../queries";
import { updateProfile } from "../actions";
import {
  PRESET_AVATARS,
  presetAvatarPath,
  presetIdFromPath,
} from "../preset-avatars";

const GENDER_OPTIONS = ["Male", "Female", "Gato"] as const;

export function EditProfileDialog({ profile }: { profile: ProfileHeader }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [gender, setGender] = useState(profile.gender ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  // Selection is local until "Save changes" — nothing is persisted on click.
  const [avatarId, setAvatarId] = useState<string | null>(
    presetIdFromPath(profile.avatarUrl),
  );
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({
        displayName,
        bio,
        gender,
        birthday,
        isPublic,
        avatarId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil data-icon="inline-start" aria-hidden /> Edit profile
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            How you appear to other CineTrack users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Avatar: pick a cat or a movie-themed character (no uploads). */}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Avatar</span>
            <div className="grid grid-cols-6 gap-2">
              {[...PRESET_AVATARS.cats, ...PRESET_AVATARS.movie].map((a) => {
                const path = presetAvatarPath(a.id);
                const selected = avatarId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarId(a.id)}
                    aria-label={a.label}
                    aria-pressed={selected}
                    title={a.label}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-ring",
                      selected
                        ? "border-primary"
                        : "border-transparent hover:border-border",
                    )}
                  >
                    {/* Static local SVG — a plain img is correct here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={path} alt="" className="size-full object-cover" />
                    {selected ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Check className="size-4 text-primary" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover comes from a show/movie's landscape art, not an upload. */}
          <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <ImageIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Set your cover from any show or movie — open its page and tap the
              <ImageIcon className="mx-1 inline size-3.5 align-text-bottom" aria-hidden />
              artwork button to use its wide backdrop.
            </span>
          </p>

          <div className="grid gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={gender || null}
                onValueChange={(v) => setGender(v ?? "")}
              >
                <SelectTrigger id="gender" className="w-full" aria-label="Gender">
                  <span
                    className={cn(
                      "flex-1 text-left",
                      !gender && "text-muted-foreground",
                    )}
                  >
                    {gender || "Select…"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>
              Public profile
              <span className="block text-xs text-muted-foreground">
                Private profiles hide your shows, stats and activity.
              </span>
            </span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
