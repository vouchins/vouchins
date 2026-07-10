"use client";

import { useState } from "react";
import { Search, Plus, Settings2, Trash2, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  domain: string;
  created_at: string;
}

interface CompaniesTabProps {
  companies: Company[];
  onCreateCompany: (name: string, domain: string) => Promise<void>;
  onUpdateCompany: (companyId: string, name: string, domain: string) => Promise<void>;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function CompaniesTab({
  companies,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  onRefresh,
  loading: parentLoading,
}: CompaniesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const filteredCompanies = companies.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim() || !newDomain.trim()) {
      setError("Both name and domain are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreateCompany(newName.trim(), newDomain.trim().toLowerCase());
      setIsCreateDialogOpen(false);
      setNewName("");
      setNewDomain("");
      toast.success("Company created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (company: Company) => {
    setSelectedCompany(company);
    setEditName(company.name);
    setEditDomain(company.domain);
    setError(null);
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!editName.trim() || !editDomain.trim()) {
      setError("Both name and domain are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onUpdateCompany(selectedCompany.id, editName.trim(), editDomain.trim().toLowerCase());
      setIsEditDialogOpen(false);
      toast.success("Company updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 outline-none">
      {/* Search and Create Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by name or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm"
            />
          </div>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={parentLoading || loading}
              variant="outline"
              size="sm"
              className="h-10 px-3 border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${parentLoading || loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <Button
          onClick={() => {
            setError(null);
            setIsCreateDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCompanies.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-neutral-50/30 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-neutral-900 flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-100 shrink-0">
                      {c.domain ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`}
                          alt=""
                          className="h-5 w-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <Building2 className={`h-4 w-4 text-neutral-400 fallback-icon ${c.domain ? "hidden" : ""}`} />
                    </div>
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600 font-mono text-xs">
                    {c.domain}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(c)}
                      className="rounded-full"
                    >
                      <Settings2 className="h-4 w-4 text-neutral-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Company</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50/50 border-red-100 py-2.5 px-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <AlertDescription className="text-xs font-semibold text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-name" className="text-neutral-600">
                Company Name
              </Label>
              <Input
                id="create-name"
                placeholder="e.g. Google"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-domain" className="text-neutral-600">
                Domain Name
              </Label>
              <Input
                id="create-domain"
                placeholder="e.g. google.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Creating..." : "Add Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Company Details</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="grid gap-5 py-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50/50 border-red-100 py-2.5 px-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <AlertDescription className="text-xs font-semibold text-red-600">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-neutral-600">
                  Company Name
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-domain" className="text-neutral-600">
                  Domain Name
                </Label>
                <Input
                  id="edit-domain"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t">
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 justify-start gap-2 rounded-lg font-semibold"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Company Permanently
                  </Button>
                ) : (
                  <div className="p-3 border border-red-200 rounded-xl bg-red-50/30 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="delete-confirm" className="text-xs font-bold text-red-700">
                        Type <span className="underline font-black">DELETE</span> to confirm. Users with this company will have their company field set to NULL.
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
                            await onDeleteCompany(selectedCompany.id);
                            setIsEditDialogOpen(false);
                            toast.success("Company deleted successfully");
                          } catch (err: any) {
                            setError("Failed to delete company: " + err.message);
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
