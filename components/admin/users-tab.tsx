"use client";

import { useState } from "react";
import {
  Search,
  Settings2,
  ShieldCheck,
  ExternalLink,
  CheckCircle,
  UserPlus,
  Trash2,
  Mail,
  Linkedin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface User {
  id: string;
  first_name: string;
  email: string; // Corporate
  personal_email?: string;
  linkedin_url?: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  onboarded: boolean;
  created_at: string;
  company?: { name: string };
}

interface UsersTabProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export function UsersTab({ users, onUpdateUser, onDeleteUser }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.personal_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (user: User) => {
    setSelectedUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await onUpdateUser(selectedUser.id, {
        first_name: selectedUser.first_name,
        personal_email: selectedUser.personal_email,
        linkedin_url: selectedUser.linkedin_url,
        is_active: selectedUser.is_active,
        is_admin: selectedUser.is_admin,
        is_verified: selectedUser.is_verified,
        onboarded: selectedUser.onboarded,
      });
      setIsEditDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 outline-none">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Search by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white shadow-sm"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">LinkedIn</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-neutral-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {u.first_name}
                      </span>
                      {u.is_admin && (
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-medium italic">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-neutral-900 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 leading-none"
                        >
                          Corp
                        </Badge>
                        {u.email}
                      </span>
                      {u.personal_email && (
                        <span className="text-neutral-500 text-xs flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 leading-none"
                          >
                            Pers
                          </Badge>
                          {u.personal_email}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-neutral-600 font-medium">
                    {u.company?.name || "N/A"}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <Badge
                        variant={u.is_active ? "secondary" : "destructive"}
                        className="w-fit text-[10px]"
                      >
                        {u.is_active ? "Active" : "Suspended"}
                      </Badge>
                      <div className="flex gap-2">
                        {u.is_verified && (
                          <span title="Verified Member">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </span>
                        )}
                        {u.onboarded && (
                          <span title="Onboarding Complete">
                            <UserPlus className="h-4 w-4 text-blue-500" />
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {u.linkedin_url ? (
                      <a
                        href={
                          u.linkedin_url.startsWith("http")
                            ? u.linkedin_url
                            : `https://${u.linkedin_url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-neutral-300">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(u)}
                      className="rounded-full"
                    >
                      <Settings2 className="h-4 w-4 text-neutral-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit User Profile</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-5 py-4">
              {/* Basic Info */}
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-neutral-600">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={selectedUser.first_name}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="personal_email" className="text-neutral-600">
                  Personal Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="personal_email"
                    className="pl-10"
                    value={selectedUser.personal_email || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        personal_email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="linkedin" className="text-neutral-600">
                  LinkedIn URL
                </Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="linkedin"
                    className="pl-10"
                    placeholder="linkedin.com/in/username"
                    value={selectedUser.linkedin_url || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        linkedin_url: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <hr className="my-2 border-neutral-100" />

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">
                      Active Status
                    </Label>
                    <p className="text-[11px] text-neutral-500">
                      Enable or disable login access
                    </p>
                  </div>
                  <Switch
                    checked={selectedUser.is_active}
                    onCheckedChange={(checked) =>
                      setSelectedUser({ ...selectedUser, is_active: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">
                      Verified Member
                    </Label>
                    <p className="text-[11px] text-neutral-500">
                      Show verification checkmark
                    </p>
                  </div>
                  <Switch
                    checked={selectedUser.is_verified}
                    onCheckedChange={(checked) =>
                      setSelectedUser({ ...selectedUser, is_verified: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">
                      Onboarding Complete
                    </Label>
                    <p className="text-[11px] text-neutral-500">
                      Flag for completed setup flow
                    </p>
                  </div>
                  <Switch
                    checked={selectedUser.onboarded}
                    onCheckedChange={(checked) =>
                      setSelectedUser({ ...selectedUser, onboarded: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-xl bg-indigo-50/30 border-indigo-100">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-indigo-900">
                      Admin Privileges
                    </Label>
                    <p className="text-[11px] text-indigo-600">
                      Access to this admin dashboard
                    </p>
                  </div>
                  <Switch
                    checked={selectedUser.is_admin}
                    onCheckedChange={(checked) =>
                      setSelectedUser({ ...selectedUser, is_admin: checked })
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 justify-start gap-2 rounded-lg"
                  onClick={() => {
                    if (
                      confirm(
                        "Permanently delete this user? All their posts and data will be removed. This cannot be undone."
                      )
                    ) {
                      onDeleteUser(selectedUser.id);
                      setIsEditDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User Permanently
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
