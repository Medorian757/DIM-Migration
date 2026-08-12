import {
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { createPageUrl } from "@/utils";
import { dim } from "@/api/dimDataClient";
import {
  Package,
  FolderOpen,
  BarChart3,
  ShoppingCart,
  Truck,
  Settings,
  Users,
  MapPin,
  ChevronLeft,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissions } from "./components/usePermissions";

const navItems = [
  {
    name: "Inventory",
    page: "Inventory",
    icon: Package,
  },
  {
    name: "Categories",
    page: "Categories",
    icon: FolderOpen,
  },
  {
    name: "Locations",
    page: "Locations",
    icon: MapPin,
  },
  {
    name: "Suppliers",
    page: "Suppliers",
    icon: Truck,
  },
  {
    name: "Reorder",
    page: "Replenishment",
    icon: ShoppingCart,
  },
  {
    name: "Reports",
    page: "Reports",
    icon: BarChart3,
  },
  {
    name: "User Management",
    page: "UserManagement",
    icon: Users,
    adminOnly: true,
  },
];

const ROOT_PAGES = [
  "Inventory",
  "Categories",
  "Locations",
  "Suppliers",
  "Replenishment",
  "Reports",
];

const scrollPositions = {};

export default function Layout({
  children,
  currentPageName,
}) {
  const {
    isAdmin: permissionsIsAdmin,
    user,
  } = usePermissions();

  const isAdmin =
    permissionsIsAdmin === true ||
    user?.role === "admin";

  const navigate = useNavigate();

  const isRootPage =
    ROOT_PAGES.includes(currentPageName);

  const [organizations, setOrganizations] =
    useState([]);

  const [
    selectedOrganizationId,
    setSelectedOrganizationId,
  ] = useState("");

  const [
    organizationsLoading,
    setOrganizationsLoading,
  ] = useState(true);

  const [
    organizationError,
    setOrganizationError,
  ] = useState("");

  useLayoutEffect(() => {
    if (
      document.getElementById(
        "mobile-ios-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = "mobile-ios-styles";

    style.textContent = `
      html, body {
        overscroll-behavior: none;
        -webkit-overflow-scrolling: touch;
      }

      * {
        -webkit-tap-highlight-color: transparent;
      }

      button,
      a,
      nav,
      label,
      [role="button"],
      [tabindex] {
        -webkit-user-select: none;
        user-select: none;
        touch-action: manipulation;
      }

      input,
      textarea,
      [contenteditable="true"] {
        -webkit-user-select: text;
        user-select: text;
      }

      @media (hover: none) and (pointer: coarse) {
        a:hover,
        button:hover,
        [role="button"]:hover {
          background-color: unset;
          color: unset;
          opacity: unset;
        }
      }

      .mobile-header-safe {
        padding-top: env(
          safe-area-inset-top,
          0px
        );
      }

      .mobile-content-safe {
        padding-top: calc(
          6.75rem +
          env(safe-area-inset-top, 0px)
        );

        padding-bottom: calc(
          4rem +
          env(safe-area-inset-bottom, 0px)
        );
      }

      @media (min-width: 1024px) {
        .mobile-content-safe {
          padding-top: 0;
          padding-bottom: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const applyDarkMode = (event) => {
      document.documentElement.classList.toggle(
        "dark",
        event.matches
      );
    };

    applyDarkMode(mediaQuery);

    mediaQuery.addEventListener(
      "change",
      applyDarkMode
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        applyDarkMode
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      try {
        setOrganizationsLoading(true);
        setOrganizationError("");

        const availableOrganizations =
          await dim.organizations.list();

        const currentOrganizationId =
          await dim.organizations.getCurrentId();

        if (cancelled) {
          return;
        }

        setOrganizations(
          availableOrganizations || []
        );

        setSelectedOrganizationId(
          currentOrganizationId || ""
        );
      } catch (error) {
        console.error(
          "Unable to load dental offices:",
          error
        );

        if (!cancelled) {
          setOrganizationError(
            error?.message ||
              "Unable to load dental offices."
          );
        }
      } finally {
        if (!cancelled) {
          setOrganizationsLoading(false);
        }
      }
    }

    if (user?.id) {
      loadOrganizations();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleOrganizationChange =
    async (event) => {
      const newOrganizationId =
        event.target.value;

      if (
        !newOrganizationId ||
        newOrganizationId ===
          selectedOrganizationId
      ) {
        return;
      }

      try {
        setOrganizationError("");

        await dim.organizations.setCurrent(
          newOrganizationId
        );

        setSelectedOrganizationId(
          newOrganizationId
        );

        window.location.reload();
      } catch (error) {
        console.error(
          "Unable to switch dental office:",
          error
        );

        setOrganizationError(
          error?.message ||
            "Unable to switch dental office."
        );
      }
    };

  const selectedOrganization =
    organizations.find(
      (organization) =>
        organization.id ===
        selectedOrganizationId
    );

  const visibleNavItems =
    navItems.filter(
      (item) =>
        !item.adminOnly || isAdmin
    );

  const showOfficeSwitcher =
    isAdmin &&
    (
      organizationsLoading ||
      organizations.length > 1
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-grow flex-col border-r border-slate-200 bg-white">
          {/* DIM LOGO */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
              <Package className="h-5 w-5 text-white" />
            </div>

            <span className="text-xl font-bold text-slate-900">
              DIM
            </span>
          </div>

          {/* ADMIN-ONLY OFFICE SWITCHER */}
          {showOfficeSwitcher && (
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dental Office
                </span>
              </div>

              <div className="relative">
                <select
                  value={
                    selectedOrganizationId
                  }
                  onChange={
                    handleOrganizationChange
                  }
                  disabled={
                    organizationsLoading
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {organizationsLoading && (
                    <option value="">
                      Loading offices...
                    </option>
                  )}

                  {!organizationsLoading &&
                    organizations.map(
                      (organization) => (
                        <option
                          key={
                            organization.id
                          }
                          value={
                            organization.id
                          }
                        >
                          {
                            organization.name
                          }
                        </option>
                      )
                    )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {organizationError && (
                <p className="mt-2 text-xs text-red-600">
                  {organizationError}
                </p>
              )}
            </div>
          )}

          {/* NAVIGATION */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {visibleNavItems.map(
              (item) => {
                const isActive =
                  currentPageName ===
                  item.page;

                const Icon = item.icon;

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(
                      item.page
                    )}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive
                          ? "text-indigo-600"
                          : "text-slate-400"
                      )}
                    />

                    {item.name}
                  </Link>
                );
              }
            )}
          </nav>

          {/* USER / SETTINGS */}
          <div className="space-y-2 border-t border-slate-100 p-4">
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user?.first_name &&
                  user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.full_name ||
                      user?.email ||
                      "Inventory Manager"}
                </p>

                <Badge
                  className={
                    isAdmin
                      ? "border-0 bg-indigo-100 text-xs text-indigo-700"
                      : "border-0 bg-slate-100 text-xs text-slate-600"
                  }
                >
                  {isAdmin
                    ? "Admin"
                    : "Staff"}
                </Badge>
              </div>

              {selectedOrganization?.name ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />

                  <p className="truncate text-xs text-slate-500">
                    {
                      selectedOrganization.name
                    }
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Track your stock efficiently
                </p>
              )}
            </div>

            <Link
              to={createPageUrl(
                "Settings"
              )}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                currentPageName ===
                  "Settings"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="mobile-header-safe fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div className="flex min-w-0 items-center gap-3">
            {!isRootPage ? (
              <button
                type="button"
                onClick={() =>
                  navigate(-1)
                }
                className="-ml-1 flex select-none items-center gap-1 pr-2 text-sm font-medium text-indigo-600"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
                  <Package className="h-4 w-4 text-white" />
                </div>

                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  DIM
                </span>
              </>
            )}
          </div>

          <Link
            to={createPageUrl(
              "Settings"
            )}
            className="select-none rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Settings"
          >
            <Settings
              className={cn(
                "h-5 w-5",
                currentPageName ===
                  "Settings"
                  ? "text-indigo-600"
                  : "text-slate-500 dark:text-slate-400"
              )}
            />
          </Link>
        </div>

        {/* ADMIN-ONLY MOBILE OFFICE SWITCHER */}
        {showOfficeSwitcher && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />

              <select
                value={
                  selectedOrganizationId
                }
                onChange={
                  handleOrganizationChange
                }
                disabled={
                  organizationsLoading
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm font-medium text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                aria-label="Select dental office"
              >
                {organizationsLoading && (
                  <option value="">
                    Loading offices...
                  </option>
                )}

                {!organizationsLoading &&
                  organizations.map(
                    (organization) => (
                      <option
                        key={
                          organization.id
                        }
                        value={
                          organization.id
                        }
                      >
                        {organization.name}
                      </option>
                    )
                  )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {organizationError && (
              <p className="mt-1 text-xs text-red-600">
                {organizationError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:hidden"
        style={{
          paddingBottom:
            "env(safe-area-inset-bottom)",
        }}
      >
        {visibleNavItems.map(
          (item) => {
            const isActive =
              currentPageName ===
              item.page;

            const Icon = item.icon;

            const href =
              createPageUrl(item.page);

            return (
              <button
                key={item.page}
                type="button"
                onClick={() => {
                  if (isActive) {
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });

                    return;
                  }

                  const scrollElement =
                    document.documentElement;

                  scrollPositions[
                    currentPageName
                  ] =
                    scrollElement.scrollTop ||
                    document.body.scrollTop;

                  navigate(href);

                  requestAnimationFrame(
                    () => {
                      const savedPosition =
                        scrollPositions[
                          item.page
                        ] || 0;

                      window.scrollTo({
                        top: savedPosition,
                        behavior: "auto",
                      });
                    }
                  );
                }}
                className={cn(
                  "flex min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 pb-1.5 pt-2",
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-400 active:text-slate-600 dark:text-slate-500"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive &&
                      "stroke-[2.5px]"
                  )}
                />

                <span className="text-[9px] font-medium leading-tight">
                  {item.name}
                </span>
              </button>
            );
          }
        )}
      </nav>

      {/* PAGE CONTENT */}
      <main className="mobile-content-safe min-h-screen overflow-x-hidden lg:pl-64">
        {children}
      </main>
    </div>
  );
}