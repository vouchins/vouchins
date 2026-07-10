"use client";

import { useState, useEffect } from "react";
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
  AlertCircle,
  RefreshCw,
  ChevronDown,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string; // Corporate
  personal_email?: string;
  linkedin_url?: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  onboarded: boolean;
  created_at: string;
  company?: { id: string; name: string }; // joined relation (read-only)
}

// Separate type for what we send to the update API (write shape)
interface UserUpdates {
  full_name?: string;
  personal_email?: string;
  linkedin_url?: string;
  is_active?: boolean;
  is_verified?: boolean;
  onboarded?: boolean;
  company_id?: string | null; // raw FK column on the users table
}

interface UsersTabProps {
  users: User[];
  onUpdateUser: (userId: string, updates: UserUpdates) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function UsersTab({ users, onUpdateUser, onDeleteUser, onRefresh, loading: parentLoading }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerification, setFilterVerification] = useState<"all" | "verified" | "unverified" | "onboarded" | "not_onboarded">("all");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyComboOpen, setIsCompanyComboOpen] = useState(false);
  const [sortField, setSortField] = useState<"name" | "email" | "company" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Extract unique companies from users list
  const uniqueCompanies = Array.from(
    new Map(
      users
        .map((u) => u.company)
        .filter((c): c is { id: string; name: string } => !!c && !!c.id)
        .map((c) => [c.id, c])
    ).values()
  );

  const handleSort = (field: "name" | "email" | "company" | "status") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Inside UsersTab component (top, after other useState hooks)
  const [company, setCompany] = useState<string>('');                // text input
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");


  useEffect(() => {
    const searchCompanies = async () => {
      if (company.trim().length < 2 || selectedCompanyId) {
        setCompanySuggestions([]);
        return;
      }

      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${company}%`)
        .limit(5);

      setCompanySuggestions(data || []);
      setShowSuggestions(true);
    };

    const timer = setTimeout(searchCompanies, 300); // debounce
    return () => clearTimeout(timer);
  }, [company, selectedCompanyId]);


  const filteredCompaniesForFilter = uniqueCompanies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(searchLower) ||
      (u.email || "").toLowerCase().includes(searchLower) ||
      (u.company?.name || "").toLowerCase().includes(searchLower) ||
      (u.personal_email || "").toLowerCase().includes(searchLower);

    const matchesVerification =
      filterVerification === "all" ||
      (filterVerification === "verified" && u.is_verified) ||
      (filterVerification === "unverified" && !u.is_verified) ||
      (filterVerification === "onboarded" && u.onboarded) ||
      (filterVerification === "not_onboarded" && !u.onboarded);

    const matchesCompany =
      filterCompany === "all" ||
      u.company?.id === filterCompany;

    return matchesSearch && matchesVerification && matchesCompany;
  });

  if (sortField) {
    filteredUsers.sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortField === "name") {
        valA = a.full_name || "";
        valB = b.full_name || "";
      } else if (sortField === "email") {
        valA = a.email || "";
        valB = b.email || "";
      } else if (sortField === "company") {
        valA = a.company?.name || "";
        valB = b.company?.name || "";
      } else if (sortField === "status") {
        return sortDirection === "asc"
          ? (a.is_verified === b.is_verified ? 0 : a.is_verified ? 1 : -1)
          : (a.is_verified === b.is_verified ? 0 : a.is_verified ? -1 : 1);
      }

      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }

  const handleEditClick = (user: User) => {
    setSelectedUser({ ...user });
    // Pre-populate company from the user's existing company (if any)
    setCompany(user.company?.name ?? '');
    setSelectedCompanyId(user.company?.id ?? null);
    setCompanySuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    if (selectedUser.onboarded && !company.trim()) {
      const errMsg = "Company is mandatory when onboarding is complete.";
      setError(errMsg);
      toast.error(errMsg, {
        id: "company-required-toast",
      });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let finalCompanyId = selectedCompanyId;
      if (company.trim()) {
        if (!finalCompanyId) {
          // Resolve or create
          const cleanName = company.trim();
          const cleanDomainName = cleanName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          const tempDomain = `${cleanDomainName}.com`;

          let { data: existing } = await supabase
            .from("companies")
            .select("id")
            .ilike("name", cleanName)
            .maybeSingle();

          // If name match fails, search by domain to prevent unique key violation
          if (!existing) {
            const { data: existingDomain } = await supabase
              .from("companies")
              .select("id")
              .eq("domain", tempDomain)
              .maybeSingle();
            existing = existingDomain;
          }

          if (existing) {
            finalCompanyId = existing.id;
          } else {
            const { data: newComp, error: createError } = await supabase
              .from("companies")
              .insert({
                name: cleanName,
                domain: tempDomain,
              })
              .select()
              .single();

            if (createError) {
              setError("Failed to create new company: " + createError.message);
              toast.error("Failed to create new company", {
                id: "company-create-error-toast",
              });
              setLoading(false);
              return;
            }
            finalCompanyId = newComp.id;
          }
        }
      } else {
        finalCompanyId = null;
      }

      await onUpdateUser(selectedUser.id, {
        full_name: selectedUser.full_name,
        personal_email: selectedUser.personal_email,
        linkedin_url: selectedUser.linkedin_url,
        is_active: selectedUser.is_active,
        is_verified: selectedUser.is_verified,
        onboarded: selectedUser.onboarded,
        company_id: finalCompanyId,
      });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
      toast.error(err.message || "Failed to update user", {
        id: "user-update-error-toast",
      });
    } finally {
      setLoading(false);
    }
  };

  const isRefreshing = parentLoading || loading;

  return (
    <div className="space-y-4 outline-none">
      {/* Search Bar, Filters & Refresh Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white shadow-sm h-10 text-xs rounded-xl"
          />
        </div>

        {/* Status Filter (Verification & Onboarding) */}
        <Select value={filterVerification} onValueChange={(val: any) => setFilterVerification(val)}>
          <SelectTrigger className="w-[155px] h-10 text-xs bg-white border-neutral-200 rounded-xl">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent className="bg-white border text-xs shadow-md">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified Only</SelectItem>
            <SelectItem value="unverified">Unverified Only</SelectItem>
            <SelectItem value="onboarded">Onboarded Only</SelectItem>
            <SelectItem value="not_onboarded">Not Onboarded Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Company Filter Popover Combobox */}
        <Popover open={isCompanyComboOpen} onOpenChange={setIsCompanyComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isCompanyComboOpen}
              className="w-[185px] justify-between h-10 border-neutral-200 text-xs text-neutral-700 bg-white hover:bg-neutral-50/50 hover:text-neutral-900 rounded-xl px-3 font-normal"
            >
              <span className="truncate">
                {filterCompany === "all"
                  ? "All Companies"
                  : uniqueCompanies.find((c) => c.id === filterCompany)?.name || "All Companies"}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2 bg-white border border-neutral-200 shadow-lg rounded-xl z-50">
            <div className="flex items-center border-b border-neutral-100 pb-2 mb-2">
              <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              <Input
                placeholder="Search company..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="h-8 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs px-0"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setFilterCompany("all");
                  setIsCompanyComboOpen(false);
                  setCompanySearch("");
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-50 ${
                  filterCompany === "all" ? "bg-indigo-50/50 text-indigo-700 font-semibold" : "text-neutral-700"
                }`}
              >
                All Companies
              </button>
              {filteredCompaniesForFilter.length === 0 && companySearch ? (
                <div className="text-neutral-400 text-xs py-4 text-center">No company found.</div>
              ) : (
                filteredCompaniesForFilter.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFilterCompany(c.id);
                      setIsCompanyComboOpen(false);
                      setCompanySearch("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-50 truncate ${
                      filterCompany === c.id ? "bg-indigo-50/50 text-indigo-700 font-semibold" : "text-neutral-700"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="h-10 px-3 border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-xl shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Active Filters Badges */}
      {(searchTerm || filterVerification !== "all" || filterCompany !== "all") && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pb-1.5 animate-in fade-in-50 duration-200">
          <span className="text-[11px] text-neutral-400 font-bold mr-1">Active Filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1">
              Search: "{searchTerm}"
              <button type="button" onClick={() => setSearchTerm("")} className="hover:bg-neutral-200 rounded-full p-0.5 transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filterVerification !== "all" && (
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1">
              Status: {filterVerification === "verified" ? "Verified" : filterVerification === "unverified" ? "Unverified" : filterVerification === "onboarded" ? "Onboarded" : "Not Onboarded"}
              <button type="button" onClick={() => setFilterVerification("all")} className="hover:bg-neutral-200 rounded-full p-0.5 transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filterCompany !== "all" && (
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1">
              Company: {uniqueCompanies.find(c => c.id === filterCompany)?.name || "Unknown"}
              <button type="button" onClick={() => setFilterCompany("all")} className="hover:bg-neutral-200 rounded-full p-0.5 transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <button 
            type="button"
            onClick={() => {
              setSearchTerm("");
              setFilterVerification("all");
              setFilterCompany("all");
            }} 
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold ml-1 hover:underline transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 font-medium">
              <tr>
                <th
                  className="px-6 py-4 cursor-pointer hover:text-neutral-900 select-none transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-neutral-500">
                    User {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:text-neutral-900 select-none transition-colors"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Contact Info {sortField === "email" && (sortDirection === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:text-neutral-900 select-none transition-colors"
                  onClick={() => handleSort("company")}
                >
                  <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Company {sortField === "company" && (sortDirection === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th
                  className="px-6 py-4 cursor-pointer hover:text-neutral-900 select-none transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Status {sortField === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-bold text-xs uppercase tracking-wider text-neutral-500">LinkedIn</th>
                <th className="px-6 py-4 text-right font-bold text-xs uppercase tracking-wider text-neutral-500">Actions</th>
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
                        {u.full_name}
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
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setError(null);
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit User Profile</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-5 py-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50/50 border-red-100 py-2.5 px-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <AlertDescription className="text-xs font-semibold text-red-600">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              {/* Basic Info */}
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-neutral-600">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={selectedUser.full_name}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      full_name: e.target.value,
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

                <div className="flex flex-col gap-1.5 p-3 border rounded-xl bg-neutral-50/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold flex items-center gap-0.5">
                        Company {selectedUser.onboarded && <span className="text-red-500">*</span>}
                      </Label>
                      <p className="text-[11px] text-neutral-500">
                        Change the user company
                      </p>
                    </div>

                    <div className="relative w-48">
                      {/* Text input – shows the selected company name or the typed query */}
                      <Input
                        placeholder="Select company…"
                        value={company}
                        onChange={(e) => {
                          setCompany(e.target.value);
                          setSelectedCompanyId(null); // reset selection when typing
                          setError(null);
                        }}
                        className={`peer ${
                          selectedUser.onboarded && !company.trim()
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                      />

                      {/* Suggestions dropdown */}
                      {showSuggestions && !selectedCompanyId && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {companySuggestions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                              onClick={() => {
                                setSelectedCompanyId(c.id);
                                setCompany(c.name);
                                setShowSuggestions(false);
                                setError(null);
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Clear button when a company is chosen */}
                      {selectedCompanyId && (
                        <button
                          type="button"
                          className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-primary"
                          onClick={() => {
                            setSelectedCompanyId(null);
                            setCompany('');
                          }}
                        >
                          <span className="sr-only">Clear</span>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedUser.onboarded && !company.trim() && (
                    <p className="text-[10px] text-red-500 text-right font-medium">
                      Company is mandatory when onboarding is complete.
                    </p>
                  )}
                </div>


                {/* <div className="flex items-center justify-between p-3 border rounded-xl bg-indigo-50/30 border-indigo-100">
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
                </div> */}
              </div>

              <div className="pt-4 border-t">
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 justify-start gap-2 rounded-lg font-semibold"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User Permanently
                  </Button>
                ) : (
                  <div className="p-3 border border-red-200 rounded-xl bg-red-50/30 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="delete-confirm" className="text-xs font-bold text-red-700">
                        Type <span className="underline font-black">DELETE</span> to confirm deletion
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE..."
                        className="bg-white border-red-200 text-red-950 placeholder:text-red-300 focus-visible:ring-red-500 text-xs py-1 h-8"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="h-7 text-xs font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteConfirmText !== "DELETE"}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await onDeleteUser(selectedUser.id);
                            setIsEditDialogOpen(false);
                            toast.success("User deleted successfully", {
                              id: "delete-success-toast",
                            });
                          } catch (err: any) {
                            toast.error("Failed to delete user: " + err.message, {
                              id: "delete-error-toast",
                            });
                          } finally {
                            setLoading(false);
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }
                        }}
                        className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-medium"
                      >
                        Confirm Delete
                      </Button>
                    </div>
                  </div>
                )}
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
