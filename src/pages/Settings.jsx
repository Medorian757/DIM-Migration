import { useEffect, useState } from "react";
import { dim as base44 } from "@/api/dimDataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, LogOut, User, Shield } from "lucide-react";
import { usePermissions } from "../components/usePermissions";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user, isAdmin } = usePermissions();

  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
  }, [user]);

  const handleSaveName = async (event) => {
    event.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) return;

    setSavingName(true);
    setNameSaved(false);
    setErrorMessage("");

    try {
      await base44.auth.updateMe({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
      });

      setNameSaved(true);

      window.setTimeout(() => {
        setNameSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Unable to save name:", error);
      setErrorMessage(
        error?.message || "Your name could not be updated."
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage("");

    try {
      await base44.auth.logout("/");
    } catch (error) {
      console.error("Unable to sign out:", error);
      setErrorMessage(
        error?.message || "You could not be signed out."
      );
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMessage("");

    try {
      /*
       * This currently signs the user out.
       * Permanent Auth deletion should be completed through a secure
       * server-side function before presenting this as full deletion.
       */
      await base44.auth.logout("/");
    } catch (error) {
      console.error("Unable to process account deletion:", error);
      setErrorMessage(
        error?.message || "The account deletion request failed."
      );
      setDeleting(false);
    }
  };

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.full_name || user?.email || "DIM User";

  const initial = (
    user?.first_name ||
    user?.full_name ||
    user?.email ||
    "?"
  )[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>

          <p className="mt-1 text-slate-500">
            Manage your account and preferences
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Account */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <User className="h-5 w-5 text-slate-400" />
              Account
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {user && (
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-lg font-bold text-white">
                    {initial}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {displayName}
                  </p>

                  <p className="truncate text-sm text-slate-500">
                    {user.email}
                  </p>
                </div>

                <Badge
                  className={
                    isAdmin
                      ? "shrink-0 border-0 bg-indigo-100 text-indigo-700"
                      : "shrink-0 border-0 bg-slate-100 text-slate-600"
                  }
                >
                  {isAdmin ? "Admin" : "Staff"}
                </Badge>
              </div>
            )}

            <form
              onSubmit={handleSaveName}
              className="space-y-3 pt-1"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>

                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(event.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>

                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(event.target.value)
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={
                  savingName ||
                  !firstName.trim() ||
                  !lastName.trim()
                }
              >
                {nameSaved
                  ? "Saved!"
                  : savingName
                    ? "Saving..."
                    : "Save Name"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-black">
              Security
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start bg-black text-white hover:bg-slate-800 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <Shield className="h-5 w-5 text-slate-400" />
              Privacy
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>
              Your data is stored securely and is never shared with
              third parties.
            </p>

            <p>
              DIM only accesses the data you explicitly enter into
              the application.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {isAdmin && (
          <Card className="border-0 bg-white shadow-sm ring-1 ring-rose-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-rose-600">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Permanently deleting an account cannot be undone.
                Inventory and history records may need to be retained
                for business reporting.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                      You will be signed out. Permanent account
                      deletion must be handled securely by the DIM
                      backend. This action should not be considered
                      complete until the Auth account has been
                      removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                      className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting
                        ? "Processing..."
                        : "Continue"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        <p className="pb-4 text-center text-xs text-slate-400">
          DIM · Version 1.0
        </p>
      </div>
    </div>
  );
}