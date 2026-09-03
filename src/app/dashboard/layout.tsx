import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { SidebarProvider } from "@/context/SidebarContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <main className="flex min-h-screen bg-[#f5f8fc]">
          <Sidebar />

          <div className="min-w-0 flex-1">
            <Header />

            <div className="dashboard-main-content">
              {children}
            </div>
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  );
}