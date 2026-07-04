"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { updateIssueAction } from "@/lib/actions/admin";

export function IssueAdminForm({ issueId, equipmentId }: { issueId: string; equipmentId: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await updateIssueAction(formData);
          setMessage(result?.error || "已更新");
        });
      }}
    >
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <Select name="status" defaultValue="in_progress">
        <option value="open">open</option>
        <option value="in_progress">in_progress</option>
        <option value="resolved">resolved</option>
        <option value="closed">closed</option>
      </Select>
      <Input name="adminNote" placeholder="管理员备注" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="markMaintenance" />
        同时将设备设为维修中
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "处理中..." : "处理反馈"}</Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
