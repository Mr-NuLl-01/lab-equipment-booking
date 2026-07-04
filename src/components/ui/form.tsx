import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-800", className)}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100",
        className,
      )}
      {...props}
    />
  );
  },
);

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}
