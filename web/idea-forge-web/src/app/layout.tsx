import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ConditionalLayout } from "@/components/conditional-layout";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Idea Forge",
  description: "Plataforma para estructurar ideas y validarlas con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
