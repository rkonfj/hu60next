"use client";

import { Bell, Compass, Grid2X2, PenLine, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/explore/latest", label: "发现", icon: Compass },
  { href: "/forums", label: "版块", icon: Grid2X2 },
  { href: "/compose", label: "发布", icon: PenLine, primary: true },
  { href: "/messages", label: "消息", icon: Bell },
  { href: "/login", label: "我的", icon: UserRound }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="移动端导航">
      {links.map(({ href, label, icon: Icon, primary }) => {
        const isActive =
          href === "/explore/latest"
            ? pathname.startsWith("/explore/")
            : pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={`${isActive ? "active" : ""} ${
              primary ? "primary" : ""
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
