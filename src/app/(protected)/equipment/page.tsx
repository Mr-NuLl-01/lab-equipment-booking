import { EquipmentCard } from "@/components/equipment/equipment-card";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { listEquipment } from "@/lib/data/equipment";

export default async function EquipmentPage() {
  const { profile } = await requireAuthenticatedProfile();
  const equipment = await listEquipment();

  return (
    <main className="safe-page space-y-5">
      <section className="space-y-1">
        <p className="text-sm text-slate-600">{profile.full_name} · {profile.role}</p>
        <h1 className="text-2xl font-semibold">设备列表</h1>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item) => <EquipmentCard key={item.id} equipment={item} />)}
      </section>
      {equipment.length === 0 ? <p className="text-slate-600">暂无设备，请管理员添加。</p> : null}
    </main>
  );
}
