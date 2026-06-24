import { useEffect, useLayoutEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, FolderOpen, BarChart3, ShoppingCart, Truck, Settings, ChevronLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissions } from "./components/usePermissions";
import { motion, AnimatePresence } from "framer-motion";
import { dim as base44 } from "@/api/dimDataClient";

const navItems = [
{ name: "Inventory", page: "Inventory", icon: Package },
{ name: "Categories", page: "Categories", icon: FolderOpen },
{ name: "Locations", page: "Locations", icon: MapPin },
{ name: "Suppliers", page: "Suppliers", icon: Truck },
{ name: "Reorder", page: "Replenishment", icon: ShoppingCart },
{ name: "Reports", page: "Reports", icon: BarChart3 }];


const ROOT_PAGES = ["Inventory", "Categories", "Locations", "Suppliers", "Replenishment", "Reports"];

// Track scroll positions per tab
const scrollPositions = {};

export default function Layout({ children, currentPageName }) {
  const { isAdmin, user } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPage = ROOT_PAGES.includes(currentPageName);

  // Inject mobile CSS once
  useLayoutEffect(() => {
    if (document.getElementById("mobile-ios-styles")) return;
    const style = document.createElement("style");
    style.id = "mobile-ios-styles";
    style.textContent = `
      html, body { overscroll-behavior: none; -webkit-overflow-scrolling: touch; }
      * { -webkit-tap-highlight-color: transparent; }
      button, a, nav, label, [role="button"], [tabindex] { -webkit-user-select: none; user-select: none; touch-action: manipulation; }
      input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
      @media (hover: none) and (pointer: coarse) { a:hover, button:hover, [role="button"]:hover { background-color: unset; color: unset; opacity: unset; } }
      .mobile-header-safe { padding-top: env(safe-area-inset-top, 0px); }
      .mobile-content-safe { padding-top: calc(3.75rem + env(safe-area-inset-top, 0px)); padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px)); }
      @media (min-width: 1024px) { .mobile-content-safe { padding-top: 0; padding-bottom: 0; } }
    `;
    document.head.appendChild(style);
  }, []);

  // Auto dark mode based on OS system preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e) => document.documentElement.classList.toggle("dark", e.matches);
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const visibleNavItems = navItems;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-slate-200">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-100">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">DIM</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive ?
                    "bg-indigo-50 text-indigo-600" :
                    "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}>
                  
                  <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                  {item.name}
                </Link>);

            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.full_name || user?.email || "Inventory Manager"}
                </p>
                <Badge
                  className={
                  isAdmin ?
                  "bg-indigo-100 text-indigo-700 border-0 text-xs" :
                  "bg-slate-100 text-slate-600 border-0 text-xs"
                  }>
                  
                  {isAdmin ? "Admin" : "Staff"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">Track your stock efficiently</p>
            </div>
            <Link
              to={createPageUrl("Settings")}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                currentPageName === "Settings" ?
                "bg-indigo-50 text-indigo-600" :
                "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}>
              
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 mobile-header-safe bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            {!isRootPage ?
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-indigo-600 font-medium text-sm select-none -ml-1 pr-2">
                <ChevronLeft className="h-5 w-5" />
                Back
              </button> :
            <>
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">DIM</span>
              </>
            }
          </div>
          <Link
            to={createPageUrl("Settings")}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
            aria-label="Settings">
            <Settings className={cn("h-5 w-5", currentPageName === "Settings" ? "text-indigo-600" : "text-slate-500 dark:text-slate-400")} />
          </Link>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {visibleNavItems.map((item) => {
          const isActive = currentPageName === item.page;
          const Icon = item.icon;
          const href = createPageUrl(item.page);
          return (
            <button
              key={item.page}
              onClick={() => {
                if (isActive) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  const scrollEl = document.documentElement;
                  scrollPositions[currentPageName] = scrollEl.scrollTop || document.body.scrollTop;
                  navigate(href);
                  requestAnimationFrame(() => {
                    const saved = scrollPositions[item.page] || 0;
                    window.scrollTo({ top: saved, behavior: "instant" });
                  });
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 select-none flex-1 min-w-0",
                isActive ? "text-indigo-600" : "text-slate-400 dark:text-slate-500 active:text-slate-600"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] leading-tight font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Main Content ── */}
      <main className="lg:pl-64 min-h-screen mobile-content-safe overflow-x-hidden">
        {children}
      </main>
    </div>);

}