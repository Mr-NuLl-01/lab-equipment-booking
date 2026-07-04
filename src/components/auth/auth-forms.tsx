"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
import { loginAction, registerAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      autoComplete="on"
      action={(formData) => {
        setError(undefined);
        const email = String(formData.get("email") || "");
        const rememberEmail = formData.get("rememberEmail") === "on";
        if (rememberEmail) {
          window.localStorage.setItem("lab-booking-email", email);
        } else {
          window.localStorage.removeItem("lab-booking-email");
        }
        startTransition(async () => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          ref={(node) => {
            if (!node || node.value) return;
            const email = window.localStorage.getItem("lab-booking-email") || "";
            node.value = email;
          }}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="rememberEmail"
          ref={(node) => {
            if (!node) return;
            node.checked = Boolean(window.localStorage.getItem("lab-booking-email"));
          }}
        />
        记住邮箱
      </label>
      <FieldError message={error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "登录中..." : "登录"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        没有账号？<Link className="font-medium text-teal-700" href="/register">注册</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError(undefined);
        const email = String(formData.get("email") || "");
        window.localStorage.setItem("lab-booking-email", email);
        startTransition(async () => {
          const result = await registerAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div>
        <Label htmlFor="fullName">姓名</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "注册中..." : "注册并进入设备列表"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        已有账号？<Link className="font-medium text-teal-700" href="/login">登录</Link>
      </p>
    </form>
  );
}
