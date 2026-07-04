"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select, Textarea } from "@/components/ui/form";
import { markBookingUsedAction } from "@/lib/actions/bookings";

export function UsageReportForm({ bookingId }: { bookingId: string }) {
  const [condition, setCondition] = useState("good");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await markBookingUsedAction(formData);
          setMessage(result?.error || "已记录使用情况");
        });
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <Label htmlFor={`condition-${bookingId}`}>使用后设备状态</Label>
        <Select
          id={`condition-${bookingId}`}
          name="condition"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
        >
          <option value="good">设备状态良好</option>
          <option value="fault">设备故障，需要管理员处理</option>
        </Select>
      </div>
      {condition === "fault" ? (
        <div>
          <Label htmlFor={`description-${bookingId}`}>故障说明</Label>
          <Textarea
            id={`description-${bookingId}`}
            name="description"
            placeholder="请描述故障现象、发生时间和影响"
            required
          />
        </div>
      ) : null}
      <FieldError message={message?.startsWith("已") ? undefined : message} />
      {message?.startsWith("已") ? <p className="text-sm text-teal-700">{message}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "提交中..." : "我已使用"}
      </Button>
    </form>
  );
}
