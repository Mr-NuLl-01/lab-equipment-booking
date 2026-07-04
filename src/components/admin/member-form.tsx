"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { updateMemberAction } from "@/lib/actions/admin";
import type { Equipment, Profile } from "@/types/database";

export function MemberForm({
  member,
  equipment,
  permissionEquipmentIds,
}: {
  member: Profile;
  equipment: Pick<Equipment, "id" | "name" | "code" | "requires_certification" | "status">[];
  permissionEquipmentIds: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const granted = new Set(permissionEquipmentIds);
  const isAdmin = member.role === "admin";

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await updateMemberAction(formData);
          setMessage(result?.error || "已更新");
          if (!result?.error) router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={member.id} />
      <input type="hidden" name="permissionsIncluded" value="1" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select name="role" defaultValue={member.role}>
          <option value="student">student</option>
          <option value="admin">admin</option>
        </Select>
        <Select name="status" defaultValue={member.status}>
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="disabled">disabled</option>
        </Select>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "保存..." : "保存"}</Button>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">设备使用权限</p>
        {isAdmin ? (
          <p className="mt-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            管理员默认拥有所有设备权限，不需要逐个勾选。
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-600">
              仅对“需要认证”的设备生效；无需认证设备，未禁用成员可直接预约。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {equipment.filter((item) => item.requires_certification).map((item) => (
                <label key={item.id} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    name="equipmentPermission"
                    type="checkbox"
                    value={item.id}
                    defaultChecked={granted.has(item.id)}
                  />
                  <span>
                    {item.name}（{item.code}）
                    {item.status === "retired" ? <span className="ml-1 text-xs text-slate-500">已移除</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
