import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  BookOpen,
  FileText,
  Headphones,
  Link2,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessagesSquare,
  PhoneCall,
  Shield,
  ShoppingBag,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { SUPPORT_LINKS, ROLE_TRACKS, canAccessRole, getUserRoleKeys } from "@/lib/glAcademyContent";

const NAV_ITEMS = [
  { to: "/novidades", label: "Novidades", icon: Megaphone, testid: "nav-updates" },
  { to: "/recrutadores", label: "Recrutador", icon: Users, testid: "nav-recruiters", roleKey: "recrutador" },
  { to: "/vendedor-ativo", label: "Vendedor Ativo", icon: PhoneCall, testid: "nav-active-seller", roleKey: "ativo" },
  { to: "/vendedor-tecnico", label: "Vendedor Técnico", icon: Headphones, testid: "nav-technical-seller", roleKey: "tecnico" },
  { to: "/conhecimento", label: "Conhecimento", icon: BookOpen, testid: "nav-knowledge" },
  { to: "/desempenho", label: "Desempenho", icon: BarChart3, testid: "nav-performance" },
  { to: "/relatorio", label: "Relatorio", icon: FileText, testid: "nav-report" },
  { to: "/produtos", label: "Produtos", icon: ShoppingBag, testid: "nav-products" },
  { to: "/links-importantes", label: "Links importantes", icon: Link2, testid: "nav-important-links" },
];

const NAV_GROUPS = [
  { title: "Comece", items: NAV_ITEMS.filter((item) => ["/novidades"].includes(item.to)) },
  {
    title: "Aprender",
    items: NAV_ITEMS.filter((item) =>
      ["/recrutadores", "/vendedor-ativo", "/vendedor-tecnico", "/conhecimento"].includes(item.to)
    ),
  },
  { title: "Evoluir", items: NAV_ITEMS.filter((item) => ["/desempenho", "/relatorio"].includes(item.to)) },
  { title: "GL Academy", items: NAV_ITEMS.filter((item) => ["/produtos", "/links-importantes"].includes(item.to)) },
];

export default function AppLayout({ children }) {
  const { user, demoMode, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const NavList = ({ onItemClick }) => (
    <div className="grid gap-4">
      {NAV_GROUPS.map((group) => {
        return (
          <div key={group.title} className="grid gap-1.5">
            <span className="gl-nav-section">{group.title}</span>
            {group.items.map((item) => {
              const locked = item.roleKey && !canAccessRole(user, item.roleKey);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onItemClick}
                  data-testid={item.testid}
                  className={({ isActive }) => `gl-nav-btn ${isActive ? "active" : ""} ${locked ? "opacity-70" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={16} strokeWidth={2} />
                    <span className="text-sm">{item.label}</span>
                  </span>
                  {locked && <LockKeyhole size={14} aria-label="Acesso bloqueado" />}
                </NavLink>
              );
            })}
          </div>
        );
      })}
      {user?.role === "admin" && (
        <NavLink
          to="/admin"
          onClick={onItemClick}
          data-testid="nav-admin"
          className={({ isActive }) => `gl-nav-btn ${isActive ? "active" : ""}`}
        >
          <span className="flex items-center gap-3">
            <Shield size={16} strokeWidth={2} />
            <span className="text-sm">Admin - Gestao</span>
          </span>
          <span className="gl-tag gl-tag-gold">admin</span>
        </NavLink>
      )}
    </div>
  );

  const Brand = ({ compact = false }) => (
    <div className="flex items-center gap-3">
      <img
        src="/assets/gl-academy-emblem-transparent.png"
        alt="GL Academy"
        className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-md object-contain`}
      />
      <div>
        <strong className={`${compact ? "text-sm" : "text-[15px]"} block leading-tight`}>GL Sales Training</strong>
        <span className="text-[11px] gl-text-soft">Recrutamento e vendas</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative">
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--gl-line)", background: "rgba(15, 15, 12, 0.85)", backdropFilter: "blur(12px)" }}
      >
        <Brand compact />
        <button
          data-testid="mobile-nav-toggle"
          className="gl-ghost-btn !min-h-[36px] !px-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute top-0 left-0 h-full w-[280px] gl-bg-surface p-5 border-r overflow-auto"
            style={{ borderColor: "var(--gl-line)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 pb-4 border-b" style={{ borderColor: "var(--gl-line)" }}>
              <Brand />
            </div>
            <NavList />
            <UserPanel user={user} demoMode={demoMode} />
            <CommunityLinks />
            <button data-testid="logout-btn-mobile" onClick={handleLogout} className="gl-ghost-btn w-full mt-3">
              <LogOut size={14} /> Sair
            </button>
            <button onClick={() => navigate("/conta")} className="gl-ghost-btn w-full mt-2">
              <UserRound size={14} /> Conta
            </button>
          </aside>
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] min-h-screen">
        <aside
          className="hidden lg:block sticky top-0 h-screen overflow-auto p-5 border-r"
          style={{
            borderColor: "var(--gl-line)",
            background:
              "linear-gradient(180deg, rgba(20,20,16,0.98), rgba(11,12,10,0.96)), rgba(16,16,13,0.92)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="mb-6 pb-4 border-b" style={{ borderColor: "rgba(216, 180, 92, 0.16)" }}>
            <Brand />
          </div>

          <NavList />

          <UserPanel user={user} demoMode={demoMode} />

          <button data-testid="logout-btn" onClick={handleLogout} className="gl-ghost-btn w-full mt-3">
            <LogOut size={14} /> Sair
          </button>
          <button onClick={() => navigate("/conta")} className="gl-ghost-btn w-full mt-2">
            <UserRound size={14} /> Conta
          </button>
          <CommunityLinks />
        </aside>

        <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8 w-full max-w-[1480px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserPanel({ user, demoMode }) {
  const roleKeys = getUserRoleKeys(user);
  const isManagement = user?.role === "admin" || user?.onboarding?.role === "gestao";
  return (
    <div className="mt-6 p-4 gl-panel-soft">
      <strong className="text-sm block">{user?.name || "Colaborador"}</strong>
      <span className="block gl-text-soft text-xs mt-1 break-all">{user?.email}</span>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {roleKeys.map((roleKey) => (
          <span key={roleKey} className="gl-tag gl-tag-gold">{ROLE_TRACKS[roleKey]?.shortTitle}</span>
        ))}
      </div>
      {isManagement && user?.role !== "admin" && <span className="gl-tag gl-tag-gold mt-2">Gestão / Liderança</span>}
      {user?.role === "admin" && <span className="gl-tag gl-tag-gold mt-2">gestao - admin</span>}
      {demoMode && <span className="gl-tag mt-2">modo local de entrega</span>}
    </div>
  );
}

function CommunityLinks() {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <a href={SUPPORT_LINKS.whatsapp} target="_blank" rel="noreferrer" className="gl-ghost-btn !px-2 !min-h-[36px] text-xs">
        <MessageCircle size={14} /> WhatsApp
      </a>
      <a href={SUPPORT_LINKS.discord} target="_blank" rel="noreferrer" className="gl-ghost-btn !px-2 !min-h-[36px] text-xs">
        <MessagesSquare size={14} /> Discord
      </a>
    </div>
  );
}
