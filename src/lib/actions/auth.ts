"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/auth";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message = error.message === "Email not confirmed"
      ? "邮箱尚未确认。"
      : error.message;
    return { error: "登录失败：" + message };
  }
  const { user, profile } = await getCurrentProfile();

  if (!user) redirect("/login");
  if (!profile) redirect("/pending");
  if (profile.status === "disabled") redirect("/disabled");
  if (profile.role === "admin") redirect("/admin");
  redirect("/equipment");
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    const message = error.message === "Signups not allowed for this instance"
      ? "当前系统未开放自助注册。请联系管理员开放注册，或由管理员在 Supabase Auth 中创建账号。"
      : error.message;
    return { error: "注册失败：" + message };
  }
  const { user } = await getCurrentProfile();
  if (!user) redirect("/login?registered=1");
  redirect("/equipment");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
