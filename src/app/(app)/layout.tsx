import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
