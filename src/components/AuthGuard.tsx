"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/admin");
        return;
      }

      try {
        const response = await fetch("/api/admin/session", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          await supabase.auth.signOut();
          router.replace("/admin");
          return;
        }

        if (mounted) {
          setChecking(false);
        }
      } catch (error) {
        console.error("[AuthGuard]", error);
        await supabase.auth.signOut();
        if (mounted) router.replace("/admin");
      }
    }

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/admin");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fc]">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
          Đang xác thực quyền truy cập...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
