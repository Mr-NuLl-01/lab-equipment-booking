"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { removeEquipmentAction, upsertEquipmentAction } from "@/lib/actions/admin";
import type { Equipment } from "@/types/database";

export function EquipmentForm({ equipment }: { equipment?: Equipment }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      action={(formData) => {
        setError(undefined);
        startTransition(async () => {
          const result = await upsertEquipmentAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      {equipment ? <input type="hidden" name="id" value={equipment.id} /> : null}
      <div>
        <Label>名称</Label>
        <Input name="name" defaultValue={equipment?.name} required />
      </div>
      <div>
        <Label>编号</Label>
        <Input name="code" defaultValue={equipment?.code} required />
      </div>
      <div>
        <Label>位置</Label>
        <Input name="location" defaultValue={equipment?.location} required />
      </div>
      <div>
        <Label>分类</Label>
        <Input name="category" defaultValue={equipment?.category} required />
      </div>
      <div>
        <Label>状态</Label>
        <Select name="status" defaultValue={equipment?.status || "normal"}>
          <option value="normal">正常</option>
          <option value="paused">暂停预约</option>
          <option value="maintenance">维修中</option>
          <option value="retired">停用</option>
        </Select>
      </div>
      <div>
        <Label>最小预约分钟</Label>
        <Input name="minBookingMinutes" type="number" min={30} step={30} defaultValue={equipment?.min_booking_minutes || 30} />
      </div>
      <div>
        <Label>最大预约分钟</Label>
        <Input name="maxBookingMinutes" type="number" min={30} step={30} defaultValue={equipment?.max_booking_minutes || ""} />
      </div>
      <div>
        <Label>排序值</Label>
        <Input name="sortOrder" type="number" min={0} step={1} defaultValue={equipment?.sort_order ?? 1000} />
        <p className="mt-1 text-xs text-slate-500">数字越小越靠前；置顶设备优先显示。</p>
      </div>
      <div className="flex items-center gap-4 pt-7">
        <label className="flex items-center gap-2 text-sm"><input name="isBookable" type="checkbox" defaultChecked={equipment?.is_bookable ?? true} />开放预约</label>
        <label className="flex items-center gap-2 text-sm"><input name="requiresCertification" type="checkbox" defaultChecked={equipment?.requires_certification ?? true} />需要认证</label>
        <label className="flex items-center gap-2 text-sm"><input name="isPinned" type="checkbox" defaultChecked={equipment?.is_pinned ?? false} />置顶</label>
      </div>
      <div className="md:col-span-2">
        <Label>描述</Label>
        <Textarea name="description" defaultValue={equipment?.description || ""} />
      </div>
      <div className="md:col-span-2">
        <Label>使用说明</Label>
        <Textarea name="usageNotes" defaultValue={equipment?.usage_notes || ""} />
      </div>
      <div className="md:col-span-2">
        <FieldError message={error} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "保存中..." : equipment ? "保存设备" : "新增设备"}
        </Button>
      </div>
    </form>
  );
}

export function RemoveEquipmentForm({ equipment }: { equipment: Equipment }) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await removeEquipmentAction(formData);
          setMessage(result?.error || "已移除设备");
        });
      }}
    >
      <input type="hidden" name="id" value={equipment.id} />
      <Button type="submit" variant="danger" disabled={pending} className="w-full sm:w-auto">
        {pending ? "移除中..." : "移除设备"}
      </Button>
      <p className="text-xs text-slate-500">移除会将设备设为停用并关闭预约，不删除历史预约。</p>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
