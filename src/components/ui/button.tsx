import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
