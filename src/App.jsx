import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { Toaster } from "@/components/ui/toaster";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import { dim as base44 } from "@/api/dimDataClient";
import {
  AuthProvider,
  useAuth,
} from "@/lib/AuthContext";

import PageNotFound from "./lib/PageNotFound";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProfileSetup from "@/components/ProfileSetup";

const Settings = lazy(
  () => import("./pages/Settings")
);

const Locations = lazy(
  () => import("./pages/Locations")
);

const Login = lazy(
  () => import("./pages/Login")
);

const UserManagement = lazy(
  () => import("./pages/UserManagement")
);

const CategoryDetails = lazy(
  () => import("./pages/CategoryDetails")
);

const {
  Pages,
  Layout,
} = pagesConfig;

const mainPageKey = "Inventory";
const MainPage = Pages[mainPageKey];

function LayoutWrapper({
  children,
  currentPageName,
}) {
  if (!Layout) {
    return <>{children}</>;
  }

  return (
    <Layout currentPageName={currentPageName}>
      {children}
    </Layout>
  );
}

function AuthenticatedApp() {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
  } = useAuth();

  const location = useLocation();

  const [
    needsProfile,
    setNeedsProfile,
  ] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkProfile() {
      try {
        const authenticated =
          await base44.auth.isAuthenticated();

        if (!isMounted) return;

        if (!authenticated) {
          setNeedsProfile(false);
          return;
        }

        const user = await base44.auth.me();

        if (!isMounted) return;

        setNeedsProfile(
          !user?.first_name ||
            !user?.last_name
        );
      } catch (error) {
        console.error(
          "Unable to check user profile:",
          error
        );

        if (isMounted) {
          setNeedsProfile(false);
        }
      }
    }

    checkProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (
    isLoadingPublicSettings ||
    isLoadingAuth
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (
    needsProfile === true &&
    location.pathname !== "/login"
  ) {
    return (
      <ProfileSetup
        onComplete={() =>
          setNeedsProfile(false)
        }
      />
    );
  }

  if (authError) {
    if (
      authError.type ===
      "user_not_registered"
    ) {
      return <UserNotRegisteredError />;
    }

    if (
      authError.type ===
        "auth_required" &&
      location.pathname !== "/login"
    ) {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
    >
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: "easeInOut",
        }}
        style={{ minHeight: "100vh" }}
      >
        <Suspense
          fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            </div>
          }
        >
          <Routes location={location}>
            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/"
              element={
                <LayoutWrapper
                  currentPageName={
                    mainPageKey
                  }
                >
                  <MainPage />
                </LayoutWrapper>
              }
            />

            {Object.entries(Pages).map(
              ([path, Page]) => (
                <Route
                  key={path}
                  path={`/${path}`}
                  element={
                    <LayoutWrapper
                      currentPageName={
                        path
                      }
                    >
                      <Page />
                    </LayoutWrapper>
                  }
                />
              )
            )}

            <Route
              path="/Settings"
              element={
                <LayoutWrapper currentPageName="Settings">
                  <Settings />
                </LayoutWrapper>
              }
            />

            <Route
              path="/Locations"
              element={
                <LayoutWrapper currentPageName="Locations">
                  <Locations />
                </LayoutWrapper>
              }
            />

            <Route
              path="/UserManagement"
              element={
                <LayoutWrapper currentPageName="UserManagement">
                  <UserManagement />
                </LayoutWrapper>
              }
            />

            <Route
              path="/CategoryDetails"
              element={
                <LayoutWrapper currentPageName="CategoryDetails">
                  <CategoryDetails />
                </LayoutWrapper>
              }
            />

            <Route
              path="*"
              element={<PageNotFound />}
            />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider
        client={queryClientInstance}
      >
        <Router>
          <AuthenticatedApp />
        </Router>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}