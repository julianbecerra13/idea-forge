"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useState, useEffect } from "react";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // No mostrar sidebar en páginas de autenticación
  const isAuthPage = pathname?.startsWith("/auth");

  // Auto-colapsar cuando navegamos a un proyecto o nueva idea
  useEffect(() => {
    if (pathname?.includes("/ideation/") || pathname === "/ideation") {
      setIsCollapsed(true);
    }
  }, [pathname]);

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="relative flex min-h-screen">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? '' : 'lg:pl-60'}`}>
        <div className="container mx-auto max-w-7xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
