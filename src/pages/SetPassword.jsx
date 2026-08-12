import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error(
          "Unable to read invitation session:",
          error
        );

        setErrorMessage(
          "The invitation link could not be verified. Please request a new invitation."
        );
      } else if (!session) {
        setErrorMessage(
          "This invitation link is invalid or has expired. Please request a new invitation."
        );
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage(
        "Your password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Your invitation has expired or is no longer valid. Please request a new invitation."
        );
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Your password has been created successfully."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      console.error(
        "Unable to set password:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Your password could not be created."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <Card className="w-full max-w-md border-0 bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-slate-900">
            Welcome to DIM
          </CardTitle>

          <p className="mt-2 text-sm text-slate-500">
            Create a password to finish setting up
            your Dental Inventory Management account.
          </p>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>

              <Input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Create password"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm Password
              </label>

              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm password"
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                Boolean(errorMessage) &&
                  !password
              }
            >
              {loading
                ? "Creating Password..."
                : "Create Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}