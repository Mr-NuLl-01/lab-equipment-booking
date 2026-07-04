import Link from "next/link";
import { MapPin, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Equipment } from "@/types/database";

export function EquipmentCard({ equipment }: { equipment: Equipment }) {
  const canBook = equipment.status === "normal" && equipment.is_bookable;

  return (
    <Link href={`/equipment/${equipment.id}`}>
      <Card className="h-full transition hover:border-teal-300 hover:shadow-md">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{equipment.name}</h2>
              <p className="text-sm text-slate-500">{equipment.code}</p>
            </div>
            <StatusBadge value={equipment.status} />
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="size-4" />
            {equipment.location}
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Wrench className="size-4" />
            {canBook ? "可预约" : "当前不可预约"}
          </p>
          <p className="text-sm text-slate-600">
            {equipment.requires_certification ? "需要管理员单独授权后预约" : "注册后即可预约"}
          </p>
          {equipment.description ? (
            <p className="line-clamp-2 text-sm text-slate-600">{equipment.description}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
