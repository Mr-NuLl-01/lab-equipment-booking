import { EquipmentCard } from "@/components/equipment/equipment-card";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { listAlertEquipmentIds, listEquipment } from "@/lib/data/equipment";

export default async function EquipmentPage() {
  const { profile } = await requireAuthenticatedProfile();
  const [equipment, alertEquipmentIds] = await Promise.all([
    listEquipment(),
    listAlertEquipmentIds(),
  ]);
  const sortedEquipment = [...equipment].sort((a, b) => {
    const aAlert = a.status === "maintenance" || alertEquipmentIds.has(a.id);
    const bAlert = b.status === "maintenance" || alertEquipmentIds.has(b.id);
    if (aAlert !== bAlert) return aAlert ? -1 : 1;
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  return (
    <main className="safe-page space-y-5">
      <section className="space-y-1">
        <p className="text-sm text-slate-600">{profile.full_name} · {profile.role}</p>
        <h1 className="text-2xl font-semibold">设备列表</h1>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedEquipment.map((item) => (
          <EquipmentCard
            key={item.id}
            equipment={item}
            hasOpenIssue={alertEquipmentIds.has(item.id)}
          />
        ))}
      </section>
      {sortedEquipment.length === 0 ? <p className="text-slate-600">暂无设备，请管理员添加。</p> : null}
    </main>
  );
}
