"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  PlusCircle,
  ClipboardCheck,
  FileCheck,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const creatorLinks: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/creator",
    icon: LayoutDashboard,
  },
  {
    label: "Browse Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    label: "My Posts",
    href: "/posts",
    icon: FileText,
  },
  {
    label: "Earnings",
    href: "/earnings",
    icon: DollarSign,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const brandLinks: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/brand",
    icon: LayoutDashboard,
  },
  {
    label: "My Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    label: "Create Campaign",
    href: "/campaigns/new",
    icon: PlusCircle,
  },
  {
    label: "Applications",
    href: "/applications",
    icon: ClipboardCheck,
  },
  {
    label: "Review Posts",
    href: "/posts/review",
    icon: FileCheck,
  },
  {
    label: "Creators",
    href: "/creators",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const links = profile?.user_type === "brand" ? brandLinks : creatorLinks;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4">
          <h4 className="font-medium text-sm mb-1">
            {profile?.user_type === "brand" ? "Need Help?" : "Boost Earnings"}
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            {profile?.user_type === "brand"
              ? "Contact our support team for assistance."
              : "Complete your profile to get more campaign invites."}
          </p>
          <Link
            href={profile?.user_type === "brand" ? "/support" : "/profile"}
            className="text-xs font-medium text-primary hover:underline"
          >
            {profile?.user_type === "brand" ? "Get Support" : "Update Profile"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
