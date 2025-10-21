"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No mostrar sidebar en páginas de autenticación
  const isAuthPage = pathname?.startsWith("/auth");

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:pl-60">
        <div className="container mx-auto max-w-7xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
