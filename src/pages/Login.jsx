import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { supabase } from "@/api/supabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const PENDING_ONBOARDING_KEY =
  "dim-pending-organization-onboarding";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const redirectTo = useMemo(
    () => params.get("redirectTo") || "/",
    [params]
  );

  const [mode, setMode] =
    useState("sign-in");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [
    organizationName,
    setOrganizationName,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const isSignUp =
    mode === "sign-up";

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email
        .trim()
        .toLowerCase();

      const normalizedFirstName =
        firstName.trim();

      const normalizedLastName =
        lastName.trim();

      const normalizedOrganizationName =
        organizationName
          .trim()
          .replace(/\s+/g, " ");

      if (
        !normalizedEmail ||
        !normalizedEmail.includes("@")
      ) {
        throw new Error(
          "Enter a valid email address."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Your password must contain at least 6 characters."
        );
      }

      if (isSignUp) {
        if (!normalizedFirstName) {
          throw new Error(
            "Enter your first name."
          );
        }

        if (!normalizedLastName) {
          throw new Error(
            "Enter your last name."
          );
        }

        if (
          normalizedOrganizationName.length <
          2
        ) {
          throw new Error(
            "Enter your dental office name."
          );
        }

        await handleSignUp({
          email: normalizedEmail,
          password,
          firstName:
            normalizedFirstName,
          lastName:
            normalizedLastName,
          organizationName:
            normalizedOrganizationName,
          redirectTo,
          navigate,
        });

        return;
      }

      await handleSignIn({
        email: normalizedEmail,
        password,
        redirectTo,
        navigate,
      });
    } catch (submitError) {
      console.error(
        "Authentication error:",
        submitError
      );

      setError(
        await getErrorMessage(
          submitError,
          "The request could not be completed."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((currentMode) =>
      currentMode === "sign-up"
        ? "sign-in"
        : "sign-up"
    );

    setError("");
    setMessage("");
  };

  const handleFormMessage = (
    nextMessage
  ) => {
    setMessage(nextMessage);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Desktop branding panel */}
        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <img
            src="/dim-login-background.png"
            alt="DIM Dental Inventory Management"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </section>

        {/* Login panel */}
        <section className="relative min-h-screen overflow-y-auto lg:flex lg:items-center lg:justify-center lg:overflow-hidden lg:bg-gradient-to-br lg:from-sky-50 lg:via-blue-50 lg:to-slate-100 lg:px-10 lg:py-10">
          {/* Mobile/tablet: one continuous full-screen background */}
          <img
            src="/dim-login-background.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top lg:hidden"
          />

          {/* Soft overlay keeps the card readable without hiding the branding */}
          <div className="absolute inset-0 bg-white/[0.03] lg:hidden" />

          {/* On mobile, the card begins below the logo + company name.
              Shorter phones can scroll naturally. */}
          <div className="relative z-10 flex min-h-screen items-start justify-center px-4 pb-8 pt-[52vh] sm:px-6 sm:pt-[50vh] lg:min-h-0 lg:w-full lg:items-center lg:p-0">
            <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl backdrop-blur-sm sm:p-7 lg:p-8">
              <div className="mb-5 sm:mb-6">
                <h1 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[34px]">
                  {isSignUp
                    ? "Create your DIM office"
                    : "Sign in"}
                </h1>

                <p className="mt-2 text-[15px] leading-6 text-slate-600">
                  {isSignUp
                    ? "Create your administrator account and a private workspace for your dental office."
                    : "Sign in to access your dental office inventory."}
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  await submit(event);

                  if (
                    isSignUp &&
                    !error
                  ) {
                    const pending =
                      getPendingOnboarding();

                    if (pending) {
                      handleFormMessage(
                        "Check your email to confirm your account. After confirmation, return here and sign in."
                      );
                    }
                  }
                }}
              >
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="firstName"
                          className="font-semibold text-slate-800"
                        >
                          First name
                        </Label>

                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(event) =>
                            setFirstName(
                              event.target.value
                            )
                          }
                          autoComplete="given-name"
                          className="h-11 rounded-xl border-slate-300 bg-white sm:h-12"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                          className="font-semibold text-slate-800"
                        >
                          Last name
                        </Label>

                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(event) =>
                            setLastName(
                              event.target.value
                            )
                          }
                          autoComplete="family-name"
                          className="h-11 rounded-xl border-slate-300 bg-white sm:h-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="organizationName"
                        className="font-semibold text-slate-800"
                      >
                        Dental office name
                      </Label>

                      <Input
                        id="organizationName"
                        type="text"
                        value={organizationName}
                        onChange={(event) =>
                          setOrganizationName(
                            event.target.value
                          )
                        }
                        placeholder="Example: Coastal Family Dental"
                        autoComplete="organization"
                        className="h-11 rounded-xl border-slate-300 bg-white sm:h-12"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-semibold text-slate-800"
                  >
                    Email
                  </Label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="Enter your email"
                      autoComplete="email"
                      className="h-11 rounded-xl border-slate-300 bg-white pl-12 sm:h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-semibold text-slate-800"
                  >
                    Password
                  </Label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <Input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete={
                        isSignUp
                          ? "new-password"
                          : "current-password"
                      }
                      className="h-11 rounded-xl border-slate-300 bg-white pl-12 pr-12 sm:h-12"
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword
                        ? (
                          <EyeOff className="h-5 w-5" />
                        )
                        : (
                          <Eye className="h-5 w-5" />
                        )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-sm text-green-700">
                      {message}
                    </p>
                  </div>
                )}

                <Button
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-base font-semibold text-white shadow-md transition hover:from-green-800 hover:via-green-700 hover:to-green-800 sm:h-12"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <Lock className="mr-2 h-5 w-5" />

                  {isSubmitting
                    ? "Working..."
                    : isSignUp
                      ? "Create dental office"
                      : "Sign in"}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 sm:my-5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-500">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                className="w-full text-center text-sm font-medium text-slate-700 transition hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={switchMode}
                disabled={isSubmitting}
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : (
                    <>
                      New dental office?{" "}
                      <span className="text-blue-600 underline underline-offset-2">
                        Create an account
                      </span>
                    </>
                  )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function handleSignUp({
  email,
  password,
  firstName,
  lastName,
  organizationName,
  redirectTo,
  navigate,
}) {
  const onboardingData = {
    email,
    firstName,
    lastName,
    organizationName,
  };

  savePendingOnboarding(
    onboardingData
  );

  const emailRedirectTo = new URL(
    "/login",
    window.location.origin
  );

  emailRedirectTo.searchParams.set(
    "redirectTo",
    redirectTo
  );

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        emailRedirectTo.toString(),

      data: {
        first_name: firstName,
        last_name: lastName,
        organization_name:
          organizationName,
        dim_new_organization: true,
        dim_onboarding_complete: false,
      },
    },
  });

  if (error) {
    throw error;
  }

  /*
   * When email confirmation is disabled, Supabase may
   * immediately create a session. In that case, complete
   * organization onboarding now.
   */
  if (data.session) {
    await createOrganization({
      organizationName,
      firstName,
      lastName,
    });

    clearPendingOnboarding();

    await markOnboardingComplete(
      data.user
    );

    navigate(redirectTo, {
      replace: true,
    });

    return;
  }

  /*
   * Email confirmation is enabled. The onboarding details
   * remain in both local storage and Auth user metadata.
   * The organization will be created after the user signs in.
   */
}

async function handleSignIn({
  email,
  password,
  redirectTo,
  navigate,
}) {
  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user) {
    throw new Error(
      "The signed-in account could not be loaded."
    );
  }

  const onboarding =
    resolveOnboardingData(
      user,
      email
    );

  if (onboarding) {
    await createOrganization({
      organizationName:
        onboarding.organizationName,
      firstName:
        onboarding.firstName,
      lastName:
        onboarding.lastName,
    });

    clearPendingOnboarding();

    await markOnboardingComplete(
      user
    );
  }

  navigate(redirectTo, {
    replace: true,
  });
}

function resolveOnboardingData(
  user,
  signedInEmail
) {
  const metadata =
    user?.user_metadata || {};

  if (
    metadata.dim_onboarding_complete ===
    true
  ) {
    return null;
  }

  const pending =
    getPendingOnboarding();

  if (
    pending &&
    pending.email
      ?.trim()
      .toLowerCase() ===
      signedInEmail
        .trim()
        .toLowerCase()
  ) {
    return pending;
  }

  if (
    metadata.dim_new_organization ===
      true &&
    metadata.organization_name
  ) {
    return {
      email: signedInEmail,
      firstName:
        metadata.first_name || "",
      lastName:
        metadata.last_name || "",
      organizationName:
        metadata.organization_name,
    };
  }

  /*
   * Invited employees have an organization_id in their
   * invitation metadata, but they do not have
   * dim_new_organization=true. They therefore skip this
   * organization-creation process.
   */
  return null;
}

async function createOrganization({
  organizationName,
  firstName,
  lastName,
}) {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "create-organization",
    {
      body: {
        organizationName,
        firstName,
        lastName,
      },
    }
  );

  if (error) {
    const functionMessage =
      await getFunctionErrorMessage(
        error
      );

    /*
     * If a previous attempt completed successfully but the
     * browser did not clear its onboarding state, allow the
     * user to continue.
     */
    if (
      functionMessage
        .toLowerCase()
        .includes(
          "already belongs to a dental office"
        )
    ) {
      return;
    }

    throw new Error(
      functionMessage ||
        "The dental office could not be created."
    );
  }

  if (data?.error) {
    if (
      String(data.error)
        .toLowerCase()
        .includes(
          "already belongs to a dental office"
        )
    ) {
      return;
    }

    throw new Error(data.error);
  }

  if (!data?.success) {
    throw new Error(
      "The dental office could not be created."
    );
  }
}

async function markOnboardingComplete(
  user
) {
  const metadata = {
    ...(user?.user_metadata || {}),
    dim_new_organization: false,
    dim_onboarding_complete: true,
  };

  delete metadata.organization_name;

  const { error } =
    await supabase.auth.updateUser({
      data: metadata,
    });

  if (error) {
    /*
     * The organization has already been created, so a
     * metadata-cleanup failure should not block access.
     */
    console.warn(
      "Unable to mark onboarding complete:",
      error
    );
  }
}

function savePendingOnboarding(
  onboardingData
) {
  try {
    window.localStorage.setItem(
      PENDING_ONBOARDING_KEY,
      JSON.stringify(
        onboardingData
      )
    );
  } catch (storageError) {
    console.warn(
      "Unable to save pending onboarding:",
      storageError
    );
  }
}

function getPendingOnboarding() {
  try {
    const stored =
      window.localStorage.getItem(
        PENDING_ONBOARDING_KEY
      );

    return stored
      ? JSON.parse(stored)
      : null;
  } catch {
    return null;
  }
}

function clearPendingOnboarding() {
  try {
    window.localStorage.removeItem(
      PENDING_ONBOARDING_KEY
    );
  } catch {
    // No action is needed.
  }
}

async function getFunctionErrorMessage(
  error
) {
  try {
    const response =
      error?.context;

    if (
      response &&
      typeof response.json ===
        "function"
    ) {
      const body =
        await response.json();

      if (body?.error) {
        return body.error;
      }
    }
  } catch {
    // Fall back to the standard error message.
  }

  return error?.message || "";
}

async function getErrorMessage(
  error,
  fallbackMessage
) {
  const functionMessage =
    await getFunctionErrorMessage(
      error
    );

  return (
    functionMessage ||
    error?.message ||
    fallbackMessage
  );
}