import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, Box } from "lucide-react";

export const AppTabs = () => {
  const { pathname } = useLocation();
  const isDisplay = pathname.startsWith("/display");

  const tabs = [
    { to: "/carton", label: "Shipping Mark 唛头", icon: Package, active: !isDisplay },
    { to: "/display", label: "Display Box 展示盒", icon: Box, active: isDisplay },
  ];

  return (
    <nav className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              t.active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
};
