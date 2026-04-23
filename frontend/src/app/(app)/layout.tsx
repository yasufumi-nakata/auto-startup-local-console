"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-slate-300" />
          セッションを確認中...
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
