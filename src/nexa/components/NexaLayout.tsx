import { ReactNode, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Users, UserCircle, ShieldCheck,
  ClipboardList, Activity, Bell, Sparkles, GraduationCap, BookOpen,
  FileBarChart, Plug, Settings, FileSearch, Crown, ChevronsLeft, ChevronsRight,
  LogOut, Building2, Check
} from "lucide-react";
import { useNexaOrg, NexaRole } from "@/nexa/hooks/useNexaOrg";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles?: NexaRole[];
  badge?: string;
}

const NAV: NavItem[] = [
  { to: "/nexa/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/nexa/interactions", label: "Atendimentos", icon: MessageSquare, badge: "Etapa 2" },
  { to: "/nexa/customers", label: "Clientes", icon: UserCircle, badge: "Etapa 2" },
  { to: "/nexa/teams", label: "Equipes", icon: Users },
  { to: "/nexa/agents", label: "Atendentes", icon: UserCircle },
  { to: "/nexa/quality", label: "Qualidade", icon: ShieldCheck, badge: "Etapa 3" },
  { to: "/nexa/scorecards", label: "Scorecards", icon: ClipboardList, badge: "Etapa 3" },
  { to: "/nexa/health-score", label: "Health Score", icon: Activity, badge: "Etapa 4" },
  { to: "/nexa/alerts", label: "Alertas", icon: Bell, badge: "Etapa 4" },
  { to: "/nexa/insights", label: "Insight (IA)", icon: Sparkles, badge: "Etapa 5" },
  { to: "/nexa/coaching", label: "Coaching", icon: GraduationCap, badge: "Etapa 4" },
  { to: "/nexa/knowledge", label: "Conhecimento", icon: BookOpen, badge: "Etapa 5" },
  { to: "/nexa/reports", label: "Relatórios", icon: FileBarChart, badge: "Etapa 4" },
  { to: "/nexa/integrations", label: "Integrações", icon: Plug, badge: "Etapa 6" },
  { to: "/nexa/audit", label: "Auditoria", icon: FileSearch, roles: ["org_admin", "auditor"] },
  { to: "/nexa/settings", label: "Configurações", icon: Settings },
  { to: "/nexa/admin", label: "Super Admin", icon: Crown, roles: ["super_admin"] },
];

export default function NexaLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { memberships, activeOrg, setActiveOrg, role, hasRole } = useNexaOrg();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleNav = NAV.filter((item) => !item.roles || hasRole(item.roles));

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} shrink-0 border-r border-slate-800 bg-slate-900/70 backdrop-blur flex flex-col transition-all duration-200`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-800 gap-2">
          <div className="h-8 w-8 rounded-lg bg-lime-400 flex items-center justify-center shrink-0">
            <span className="text-slate-950 font-black text-sm">N</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold tracking-wide">NEXA</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Insight Platform</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {visibleNav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 mx-2 my-0.5 rounded-md text-sm transition
                  ${active
                    ? "bg-lime-400/10 text-lime-300 border border-lime-400/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50 border border-transparent"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 text-xs"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Recolher</>)}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center gap-3 px-6">
          {/* Org switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-slate-200 hover:bg-slate-800">
                <Building2 className="h-4 w-4 text-lime-400" />
                <span className="font-semibold">{activeOrg?.name ?? "Nenhuma empresa"}</span>
                {role && (
                  <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1">
                    {role.replace("_", " ")}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 bg-slate-900 border-slate-800 text-slate-100">
              <DropdownMenuLabel className="text-slate-400 text-xs">Suas empresas</DropdownMenuLabel>
              {memberships.length === 0 && (
                <div className="px-2 py-3 text-xs text-slate-500">Você ainda não pertence a nenhuma empresa.</div>
              )}
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setActiveOrg(m.id)}
                  className="flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500">{m.role.replace("_", " ")}</div>
                  </div>
                  {m.id === activeOrg?.id && <Check className="h-3.5 w-3.5 text-lime-400" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => navigate("/nexa/onboarding")}
                className="hover:bg-slate-800 cursor-pointer text-lime-300"
              >
                + Cadastrar nova empresa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-400 hidden md:inline">{user?.email}</span>
            <Button
              variant="ghost" size="sm"
              onClick={async () => { await signOut(); navigate("/nexa/login"); }}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
