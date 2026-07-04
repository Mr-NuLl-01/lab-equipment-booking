"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import {
  completeMaintenanceTaskAction,
  completeMaintenanceWindowAction,
  createMaintenanceWindowAction,
  upsertMaintenanceTaskAction,
} from "@/lib/actions/admin";
import { formatLocalDate } from "@/lib/utils/time";
import type { Equipment, MaintenanceTask, MaintenanceWindow } from "@/types/database";

type MaintenanceTaskWithEquipment = MaintenanceTask & {
  equipment: Pick<Equipment, "name" | "code" | "location">;
};

export function MaintenanceTaskForm({
  equipment,
  task,
}: {
  equipment: Pick<Equipment, "id" | "name" | "code">[];
  task?: MaintenanceTaskWithEquipment;
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await upsertMaintenanceTaskAction(formData);
          setMessage(result?.error || "已保存");
        });
      }}
    >
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <div>
        <Label>设备</Label>
        <Select name="equipmentId" defaultValue={task?.equipment_id || ""} required>
          <option value="">选择设备</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}（{item.code}）
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>维护项</Label>
        <Input name="name" defaultValue={task?.name || ""} placeholder="例如：晶振检查" required />
      </div>
      <div>
        <Label>提醒类型</Label>
        <Select name="taskType" defaultValue={task?.task_type || "maintenance"}>
          <option value="maintenance">定期维护提醒</option>
          <option value="consumable">耗材提醒</option>
        </Select>
      </div>
      <div>
        <Label>提醒间隔（天）</Label>
        <Input name="intervalDays" type="number" min={1} defaultValue={task?.interval_days || 15} required />
      </div>
      <div>
        <Label>上次完成日期</Label>
        <Input
          name="lastCompletedAt"
          type="date"
          defaultValue={task ? formatLocalDate(new Date(task.last_completed_at)) : formatLocalDate(new Date())}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Label>说明</Label>
        <Textarea name="description" defaultValue={task?.description || ""} placeholder="例如：检查晶振片是否需要更换" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={task?.is_active ?? true} />
        启用提醒
      </label>
      <div className="md:col-span-2">
        <FieldError message={message?.startsWith("已") ? undefined : message} />
        {message?.startsWith("已") ? <p className="mb-2 text-sm text-teal-700">{message}</p> : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "保存中..." : task ? "保存维护项" : "新增维护项"}
        </Button>
      </div>
    </form>
  );
}

export function CompleteMaintenanceForm({ taskId }: { taskId: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await completeMaintenanceTaskAction(formData);
          setMessage(result?.error || "已重置计时");
        });
      }}
    >
      <input type="hidden" name="id" value={taskId} />
      <Input name="completedAt" type="date" defaultValue={formatLocalDate(new Date())} required />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "处理中..." : "完成并重置"}
      </Button>
      {message ? <p className="text-sm text-slate-600 sm:col-span-2">{message}</p> : null}
    </form>
  );
}

export function MaintenanceWindowForm({
  equipment,
}: {
  equipment: Pick<Equipment, "id" | "name" | "code">[];
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const today = formatLocalDate(new Date());

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await createMaintenanceWindowAction(formData);
          setMessage(result?.error || "已创建维护窗口，并取消冲突预约");
        });
      }}
    >
      <div>
        <Label>设备</Label>
        <Select name="equipmentId" required>
          <option value="">选择设备</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}（{item.code}）
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>维护原因</Label>
        <Input name="reason" placeholder="例如：真空泵维护" required />
      </div>
      <div>
        <Label>开始日期</Label>
        <Input name="startDate" type="date" defaultValue={today} required />
      </div>
      <div>
        <Label>开始时间</Label>
        <Input name="startTime" type="time" step={1800} defaultValue="09:00" required />
      </div>
      <div>
        <Label>结束日期</Label>
        <Input name="endDate" type="date" defaultValue={today} required />
      </div>
      <div>
        <Label>结束时间</Label>
        <Input name="endTime" type="time" step={1800} defaultValue="12:00" required />
      </div>
      <div className="md:col-span-2">
        <FieldError message={message?.startsWith("已") ? undefined : message} />
        {message?.startsWith("已") ? <p className="mb-2 text-sm text-teal-700">{message}</p> : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "创建中..." : "创建维护窗口"}
        </Button>
      </div>
    </form>
  );
}

export function CompleteMaintenanceWindowForm({
  window,
}: {
  window: MaintenanceWindow;
}) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await completeMaintenanceWindowAction(formData);
          setMessage(result?.error || "已结束维护，并尝试恢复可完成的预约");
        });
      }}
    >
      <input type="hidden" name="id" value={window.id} />
      <Input name="completedAt" type="datetime-local" required />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "处理中..." : "提前完成维护"}
      </Button>
      {message ? <p className="text-sm text-slate-600 sm:col-span-2">{message}</p> : null}
    </form>
  );
}
