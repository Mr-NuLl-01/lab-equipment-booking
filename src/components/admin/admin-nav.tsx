import Link from "next/link";

const links = [
  ["设备", "/admin/equipment"],
  ["成员", "/admin/members"],
  ["预约", "/admin/bookings"],
  ["异常", "/admin/issues"],
  ["维护", "/admin/maintenance"],
];

export function AdminNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
