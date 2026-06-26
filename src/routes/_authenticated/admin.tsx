import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · OTT & AI Store" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const bootstrap = useServerFn(bootstrapAdmin);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/auth" }); return; }
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (isAdmin === null) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card-premium max-w-md rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If you are the first admin, claim the role now. Otherwise contact your workspace owner.
          </p>
          <Button
            className="mt-6"
            onClick={async () => {
              try {
                const r = await bootstrap();
                if ((r as any)?.ok) { toast.success("Admin role granted"); setIsAdmin(true); }
                else toast.error((r as any)?.error ?? "Could not claim admin");
              } catch (e: any) { toast.error(e?.message ?? "Failed"); }
            }}
          >
            Claim admin role
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/70 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              <span>Admin Console</span>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
