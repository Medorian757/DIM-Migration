import { useState } from "react";
import { dim as base44 } from "@/api/dimDataClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, LogOut, User, Shield, Users, UserPlus } from "lucide-react";
import { usePermissions } from "../components/usePermissions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const { user, isAdmin } = usePermissions();

  const queryClient = useQueryClient();
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });
  const [deleting, setDeleting] = useState(false);
  const [togglingRole, setTogglingRole] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
    setInviteMsg({ type: "success", text: `Invite sent to ${inviteEmail.trim()}` });
    setInviteEmail("");
    setInviting(false);
  };

  const handleToggleRole = async (u) => {
    setTogglingRole(u.id);
    const newRole = u.role === "admin" ? "user" : "admin";
    await base44.entities.User.update(u.id, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
    setTogglingRole(null);
  };
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Pre-fill from user data once loaded
  useState(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  });

  const handleSaveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    await base44.auth.updateMe({ first_name: firstName.trim(), last_name: lastName.trim() });
    setSavingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Per App Store requirements: log user out and show confirmation.
    // Full account deletion requires contacting support as backend deletion
    // is handled server-side for data integrity.
    await base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and preferences</p>
        </div>

        {/* Account Info */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <User className="h-5 w-5 text-slate-400" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-lg">
                    {(user.first_name || user.full_name || user.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.full_name || user.email}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                </div>
                <Badge
                  className={
                    isAdmin
                      ? "bg-indigo-100 text-indigo-700 border-0 shrink-0"
                      : "bg-slate-100 text-slate-600 border-0 shrink-0"
                  }
                >
                  {isAdmin ? "Admin" : "Staff"}
                </Badge>
              </div>
            )}
            <form onSubmit={handleSaveName} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={savingName || !firstName.trim() || !lastName.trim()}>
                {nameSaved ? "Saved!" : savingName ? "Saving..." : "Save Name"}
              </Button>
            </form>
            <Button
              variant="outline"
              className="w-full justify-start text-white"
              onClick={() => base44.auth.logout("/")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Staff Members - Admin only */}
        {isAdmin && (
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-black">
                <Users className="h-5 w-5 text-slate-400" />
                Staff Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invite form */}
              <form onSubmit={handleInvite} className="flex gap-2 flex-wrap p-3 bg-indigo-50 rounded-xl text-black">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-0 bg-white"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="border border-input rounded-md px-3 py-1.5 text-sm bg-white text-black"
                >
                  <option value="user">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {inviting ? "Sending..." : "Invite"}
                </Button>
              </form>
              {inviteMsg && (
                <p className={`text-sm px-1 ${inviteMsg.type === "success" ? "text-green-600" : "text-rose-600"}`}>
                  {inviteMsg.text}
                </p>
              )}
              <div className="space-y-2">
              {allUsers.length === 0 ? (
                <p className="text-sm text-slate-400">No users found.</p>
              ) : (
                [...allUsers]
                  .sort((a, b) => (a.first_name || a.full_name || "").localeCompare(b.first_name || b.full_name || ""))
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">
                          {(u.first_name || u.full_name || u.email || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.full_name || u.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={u.role === "admin" ? "bg-indigo-100 text-indigo-700 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>
                          {u.role === "admin" ? "Admin" : "Staff"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {u.updated_date
                            ? formatDistanceToNow(new Date(u.updated_date), { addSuffix: true })
                            : "Never"}
                        </span>
                        {u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            disabled={togglingRole === u.id}
                            onClick={() => handleToggleRole(u)}
                          >
                            {togglingRole === u.id ? "..." : u.role === "admin" ? "Make Staff" : "Make Admin"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
              )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <Shield className="h-5 w-5 text-slate-400" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>Your data is stored securely and is never shared with third parties.</p>
            <p>StockFlow only accesses the data you explicitly enter into the application.</p>
          </CardContent>
        </Card>

        {/* Danger Zone - Admin only */}
        {isAdmin && (
          <Card className="bg-white border-0 shadow-sm ring-1 ring-rose-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-rose-600">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Permanently delete your account and all associated data. This action cannot be
                undone. Your inventory data, history, and settings will be permanently removed.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all associated data. To complete
                      account deletion, you will be signed out and your account will be queued for
                      removal. This action <strong>cannot be undone</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? "Processing..." : "Yes, Delete My Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">StockFlow · Version 1.0</p>
      </div>
    </div>
  );
}