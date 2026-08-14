import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <main className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex-1">
          <Header />

          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
