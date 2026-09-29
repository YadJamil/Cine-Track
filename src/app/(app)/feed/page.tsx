import { redirect } from "next/navigation";

export default function FeedPage() {
  redirect("/notifications?tab=feed");
}
