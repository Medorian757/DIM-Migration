import { useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { supabase } from "@/api/supabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isSignUp
              ? "Create your DIM office"
              : "Sign in to DIM"}
          </CardTitle>

          <CardDescription>
            {isSignUp
              ? "Create your administrator account and a private workspace for your dental office."
              : "Sign in to access your dental office inventory."}
          </CardDescription>
        </CardHeader>

        <CardContent>
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
                    <Label htmlFor="firstName">
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
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">
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
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">
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
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password
              </Label>

              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete={
                  isSignUp
                    ? "new-password"
                    : "current-password"
                }
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-sm text-green-700">
                  {message}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Working..."
                : isSignUp
                  ? "Create dental office"
                  : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-sm text-slate-600 underline hover:text-slate-900"
            onClick={switchMode}
            disabled={isSubmitting}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "New dental office? Create an account"}
          </button>
        </CardContent>
      </Card>
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