import { useMemo, useState } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Shield,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

import { dim as base44 } from "@/api/dimDataClient";
import { usePermissions } from "../components/usePermissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UserManagement() {
  const {
    user: currentUser,
    isAdmin,
  } = usePermissions();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [workingUserId, setWorkingUserId] =
    useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["all-users"],
    queryFn: () =>
      base44.entities.User.list("first_name"),
    enabled: Boolean(isAdmin),
  });

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => {
      const fullName =
        `${user.first_name || ""} ${
          user.last_name || ""
        }`
          .trim()
          .toLowerCase();

      return (
        fullName.includes(term) ||
        (user.full_name || "")
          .toLowerCase()
          .includes(term) ||
        (user.email || "")
          .toLowerCase()
          .includes(term) ||
        (user.role || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [search, users]);

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["all-users"],
    });

    await refetch();
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    const email = inviteEmail
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("");
      setErrorMessage(
        "Enter a valid email address."
      );
      return;
    }

    setInviting(true);
    clearMessages();

    try {
      await base44.users.inviteUser({
        email,
        role: inviteRole,
      });

      setInviteEmail("");
      setInviteRole("user");

      setMessage(
        `Invitation sent to ${email}.`
      );

      await refreshUsers();
    } catch (error) {
      console.error(
        "Unable to invite user:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "The invitation could not be sent."
        )
      );
    } finally {
      setInviting(false);
    }
  };

  const handleToggleRole = async (
    selectedUser
  ) => {
    if (
      selectedUser.id === currentUser?.id
    ) {
      setMessage("");
      setErrorMessage(
        "You cannot change your own administrator role."
      );
      return;
    }

    const newRole =
      selectedUser.role === "admin"
        ? "user"
        : "admin";

    const confirmed = window.confirm(
      `Change ${getDisplayName(
        selectedUser
      )} to ${
        newRole === "admin"
          ? "Admin"
          : "Staff"
      }?`
    );

    if (!confirmed) {
      return;
    }

    setWorkingUserId(selectedUser.id);
    clearMessages();

    try {
      await base44.entities.User.update(
        selectedUser.id,
        {
          role: newRole,
        }
      );

      await refreshUsers();

      setMessage(
        `${getDisplayName(
          selectedUser
        )} is now ${
          newRole === "admin"
            ? "an Admin"
            : "Staff"
        }.`
      );
    } catch (error) {
      console.error(
        "Unable to update role:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "The user's role could not be changed."
        )
      );
    } finally {
      setWorkingUserId(null);
    }
  };

  const handleDeleteUser = async (
    selectedUser
  ) => {
    if (
      selectedUser.id === currentUser?.id
    ) {
      setMessage("");
      setErrorMessage(
        "You cannot delete your own account."
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${getDisplayName(
        selectedUser
      )}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setWorkingUserId(selectedUser.id);
    clearMessages();

    try {
      await base44.users.deleteUser(
        selectedUser.id
      );

      await refreshUsers();

      setMessage(
        `${getDisplayName(
          selectedUser
        )} was permanently deleted.`
      );
    } catch (error) {
      console.error(
        "Unable to delete user:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "The user could not be deleted."
        )
      );
    } finally {
      setWorkingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold text-red-900">
              Administrator access required
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Only administrators can manage
              DIM users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Users className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                User Management
              </h1>

              <p className="mt-1 text-slate-500">
                Invite staff, manage roles,
                and delete DIM users.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <UserPlus className="h-5 w-5 text-slate-400" />
              Invite User
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleInvite}
              className="flex flex-col gap-3 rounded-xl bg-indigo-50 p-4 sm:flex-row"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(
                    event.target.value
                  );

                  if (errorMessage) {
                    setErrorMessage("");
                  }
                }}
                className="flex-1 bg-white text-black"
                autoComplete="email"
                required
              />

              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value
                  )
                }
                className="rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
              >
                <option value="user">
                  Staff
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>

              <Button
                type="submit"
                disabled={
                  inviting ||
                  !inviteEmail.trim()
                }
              >
                <UserPlus className="mr-2 h-4 w-4" />

                {inviting
                  ? "Sending..."
                  : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-black">
                <Users className="h-5 w-5 text-slate-400" />
                Users
              </CardTitle>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, email, or role"
            />

            {isLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading users...
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No users found.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredUsers
                  .slice()
                  .sort((a, b) =>
                    getDisplayName(
                      a
                    ).localeCompare(
                      getDisplayName(b),
                      undefined,
                      {
                        sensitivity: "base",
                      }
                    )
                  )
                  .map((listedUser) => {
                    const isCurrentUser =
                      listedUser.id ===
                      currentUser?.id;

                    const isWorking =
                      workingUserId ===
                      listedUser.id;

                    return (
                      <div
                        key={listedUser.id}
                        className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500">
                            <span className="font-bold text-white">
                              {getInitial(
                                listedUser
                              )}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-slate-900">
                                {getDisplayName(
                                  listedUser
                                )}
                              </p>

                              {isCurrentUser && (
                                <Badge className="border-0 bg-slate-200 text-slate-700">
                                  You
                                </Badge>
                              )}

                              <Badge
                                className={
                                  listedUser.role ===
                                  "admin"
                                    ? "border-0 bg-indigo-100 text-indigo-700"
                                    : "border-0 bg-slate-200 text-slate-600"
                                }
                              >
                                {listedUser.role ===
                                "admin"
                                  ? "Admin"
                                  : "Staff"}
                              </Badge>
                            </div>

                            <p className="truncate text-sm text-slate-500">
                              {listedUser.email ||
                                "No email available"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              isCurrentUser ||
                              isWorking
                            }
                            onClick={() =>
                              handleToggleRole(
                                listedUser
                              )
                            }
                          >
                            {listedUser.role ===
                            "admin" ? (
                              <UserCog className="mr-2 h-4 w-4" />
                            ) : (
                              <Shield className="mr-2 h-4 w-4" />
                            )}

                            {isWorking
                              ? "Working..."
                              : listedUser.role ===
                                  "admin"
                                ? "Make Staff"
                                : "Make Admin"}
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={
                              isCurrentUser ||
                              isWorking
                            }
                            onClick={() =>
                              handleDeleteUser(
                                listedUser
                              )
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />

                            {isWorking
                              ? "Working..."
                              : "Delete"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getDisplayName(user) {
  if (
    user.first_name &&
    user.last_name
  ) {
    return `${user.first_name} ${user.last_name}`;
  }

  return (
    user.full_name ||
    user.email ||
    "Unnamed user"
  );
}

function getInitial(user) {
  const value =
    user.first_name ||
    user.full_name ||
    user.email ||
    "?";

  return value[0].toUpperCase();
}

function getErrorMessage(
  error,
  fallbackMessage
) {
  if (
    error?.context?.body &&
    typeof error.context.body === "object" &&
    error.context.body.error
  ) {
    return error.context.body.error;
  }

  return (
    error?.message ||
    fallbackMessage
  );
}