import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ConditionalLayout } from "@/components/conditional-layout";
import { Toaster } from "@/components/ui/sonner";
import { PropagationProvider } from "@/contexts/PropagationContext";

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
          <PropagationProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
            <Toaster />
          </PropagationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
