"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select, Textarea } from "@/components/ui/form";
import { createIssueAction } from "@/lib/actions/issues";
import type { Equipment } from "@/types/database";

type IssueFormProps = {
  equipmentId?: string;
  equipmentOptions?: Pick<Equipment, "id" | "name" | "code">[];
};

export function IssueForm({ equipmentId, equipmentOptions = [] }: IssueFormProps) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await createIssueAction(formData);
          setMessage(result?.error || "异常反馈已提交");
        });
      }}
    >
      {equipmentId ? <input type="hidden" name="equipmentId" value={equipmentId} /> : null}
      {!equipmentId ? (
        <div>
          <Label htmlFor="equipmentId">设备</Label>
          <Select id="equipmentId" name="equipmentId" required>
            <option value="">选择设备</option>
            {equipmentOptions.map((equipment) => (
              <option key={equipment.id} value={equipment.id}>
                {equipment.name}（{equipment.code}）
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div>
        <Label htmlFor="issueType">异常类型</Label>
        <Select id="issueType" name="issueType" defaultValue="malfunction">
          <option value="malfunction">设备故障</option>
          <option value="consumable">耗材问题</option>
          <option value="abnormal_use">异常使用</option>
          <option value="other">其他</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">描述</Label>
        <Textarea id="description" name="description" placeholder="请描述现象、发生时间和影响" required />
      </div>
      <FieldError message={message?.startsWith("异常") ? undefined : message} />
      {message?.startsWith("异常") ? <p className="text-sm text-teal-700">{message}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "提交中..." : "提交异常反馈"}
      </Button>
    </form>
  );
}
