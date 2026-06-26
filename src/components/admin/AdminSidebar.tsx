import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Megaphone,
  LifeBuoy, Settings, LogOut, Bot, Wallet, CreditCard, Smile, Palette, MousePointerClick, ArrowDownToLine,

} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicBranding } from "@/lib/admin/payments.functions";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: FolderTree },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Wallets", url: "/admin/wallets", icon: Wallet },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Broadcasts", url: "/admin/broadcasts", icon: Megaphone },
  { title: "Support", url: "/admin/support", icon: LifeBuoy },
  { title: "Bot Buttons", url: "/admin/buttons", icon: MousePointerClick },
  { title: "Emojis", url: "/admin/emojis", icon: Smile },
  { title: "Branding", url: "/admin/branding", icon: Palette },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];


export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? path === url : path === url || path.startsWith(url + "/");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const brandingFn = useServerFn(getPublicBranding);
  const { data: brand } = useQuery({ queryKey: ["public-branding"], queryFn: () => brandingFn(), staleTime: 60_000 });
  const siteName = brand?.site_name || "OTT & AI Store";
  const panelTitle = brand?.panel_title || "Admin console";
  const logo = brand?.panel_logo_url || brand?.logo_url;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
      <SidebarHeader className="border-b border-white/5">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 overflow-hidden place-items-center rounded-xl bg-[image:var(--gradient-primary)] btn-glow">
            {logo ? <img src={logo} alt="" className="h-full w-full object-cover" />
              : <Bot className="h-5 w-5 text-primary-foreground" />}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{siteName}</div>
              <div className="truncate text-xs text-muted-foreground">{panelTitle}</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
