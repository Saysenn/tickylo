import { redirect } from "next/navigation";

// Settings moved to /settings
export default function OldSettingsPage() {
  redirect("/settings");
}
