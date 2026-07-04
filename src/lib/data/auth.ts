import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profile) return { user, profile };

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const { data: createdProfile } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      role: "student",
      status: "pending",
    })
    .select("*")
    .single<Profile>();

  return { user, profile: createdProfile || null };
}

export async function requireAuthenticatedProfile() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/pending");
  if (profile.status === "disabled") redirect("/disabled");
  return { user, profile };
}

export async function requireProfile() {
  const session = await requireAuthenticatedProfile();
  if (session.profile.status === "pending") redirect("/pending");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuthenticatedProfile();
  if (session.profile.status !== "active") redirect("/pending");
  if (session.profile.role !== "admin") redirect("/");
  return session;
}
