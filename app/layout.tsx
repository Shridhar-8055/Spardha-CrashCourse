import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Navbar from "@/components/Navbar";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Sri Spardha Academy",
  description: "Video lessons for Sri Spardha Academy students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-8">
            <AuthGate>{children}</AuthGate>
          </main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted">
            © Sri Spardha Academy
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
