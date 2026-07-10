"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail,
  Bell,
  Users,
  Plus,
  Send,
  FileText,
  Search,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Trash2,
  Edit3,
  Heading,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  RemoveFormatting,
  Building,
  ShieldCheck,
  Check,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { supabase } from "@/lib/supabase/browser";

interface UserGroup {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  member_count: number;
  rules?: any;
}

interface Campaign {
  id: string;
  title: string;
  body: string;
  target_type: "email" | "notification";
  recipient_group_id: string;
  recipient_group_name: string;
  status: "draft" | "sending" | "sent" | "failed";
  sent_count: number;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  company?: { id: string; name: string } | null;
}

// Predefined Email Templates
const EMAIL_TEMPLATES = {
  welcome: {
    name: "Welcome Onboarding",
    subject: "Welcome to Vouchins!",
    html: `<h3>Welcome to Vouchins!</h3>
<p>We are thrilled to have you join our verified professional community. Vouchins is built on trust, designed to help professionals connect, vouch for each other, and discover opportunities.</p>
<p>Here are a few ways to get started:</p>
<ul>
  <li><strong>Complete Your Profile:</strong> Add your experience and link your public profiles to build trust.</li>
  <li><strong>Vouch for Colleagues:</strong> Exchange vouches with coworkers to enhance your profile's credibility.</li>
  <li><strong>Browse Opportunities:</strong> Check our jobs section to find companies hiring in your network.</li>
</ul>
<p>If you have any questions or feedback, just reply to this email.</p>
<p>Best regards,<br/>The Vouchins Team</p>`,
  },
  update: {
    name: "Weekly Platform Update",
    subject: "What's new on Vouchins this week",
    html: `<h3>Weekly Community Update</h3>
<p>Hello Vouchin, here is what has been happening in the community this past week:</p>
<ul>
  <li><strong>Improved Navigation:</strong> We updated our navigation panel so you can jump between posts, jobs, and admin sections faster.</li>
  <li><strong>Network Growth:</strong> Verified members from over 15 new companies joined this week, expanding our collective reach.</li>
  <li><strong>Active Job Boards:</strong> New positions in Engineering, Product, and Sales have been posted by our partners.</li>
</ul>
<p>Keep your profile updated to stay visible to potential recruiters!</p>`,
  },
  announcement: {
    name: "Important Announcement",
    subject: "Important Service Announcement",
    html: `<h3>Important Platform Notice</h3>
<p>Please be advised that we will be performing routine database optimization on <strong>Sunday between 2:00 AM and 2:30 AM UTC</strong>.</p>
<p>During this brief window, you might experience temporary intermittent connection delays when accessing the feed or messaging. All features will remain fully functional immediately afterwards.</p>
<p>We appreciate your patience as we continue to scale the infrastructure.</p>`,
  },
};

export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState(false);

  // Campaign Form State
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignTargetType, setCampaignTargetType] = useState<"email" | "notification">("notification");
  const [campaignGroupId, setCampaignGroupId] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Group Form State
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<boolean>(false);

  // Search states for dropdowns
  const [groupSearch, setGroupSearch] = useState("");
  const [isGroupComboOpen, setIsGroupComboOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyComboOpen, setIsCompanyComboOpen] = useState(false);
  const [groupsListSearch, setGroupsListSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, groupsRes, usersRes, companiesRes] = await Promise.all([
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/user-groups"),
        supabase.from("users").select("id, full_name, email, is_verified, company:companies(id, name)").order("full_name"),
        supabase.from("companies").select("id, name").order("name"),
      ]);

      const cData = await campaignsRes.json();
      const gData = await groupsRes.json();

      setCampaigns(cData.campaigns || []);
      setGroups(gData.groups || []);
      const formattedUsers = (usersRes.data || []).map((u: any) => {
        const comp = Array.isArray(u.company) ? u.company[0] : u.company;
        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          is_verified: u.is_verified,
          company: comp ? { id: comp.id, name: comp.name } : null,
        };
      });
      setUsers(formattedUsers);
      setCompanies(companiesRes.data || []);
    } catch (e) {
      console.error("Failed to load campaign data", e);
      toast.error("Failed to load campaigns and user groups");
    } finally {
      setLoading(false);
    }
  };

  // ContentEditable Editor Helper commands
  const execEditorCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setCampaignBody(editorRef.current.innerHTML);
    }
  };

  const handleLinkCommand = () => {
    const url = prompt("Enter the URL:");
    if (url) execEditorCommand("createLink", url);
  };

  // Sync state when typing in editor
  const handleEditorInput = () => {
    if (editorRef.current) {
      setCampaignBody(editorRef.current.innerHTML);
    }
  };

  // Template select handler
  const handleSelectTemplate = (templateKey: string) => {
    if (templateKey === "custom") {
      setCampaignTitle("");
      setCampaignBody("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      return;
    }

    const template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES];
    if (template) {
      setCampaignTitle(template.subject);
      setCampaignBody(template.html);
      if (editorRef.current) {
        editorRef.current.innerHTML = template.html;
      }
    }
  };

  // Send / Save Campaign Handler
  const handleCreateCampaign = async (statusToSet: "draft" | "sent") => {
    if (!campaignTitle.trim()) {
      toast.error("Please enter a campaign title / subject");
      return;
    }
    if (!campaignBody.trim() || campaignBody === "<br>" || campaignBody === "<div><br></div>") {
      toast.error("Please compose a campaign message body");
      return;
    }
    if (!campaignGroupId) {
      toast.error("Please select a recipient group");
      return;
    }

    const recipientGroup = groups.find((g) => g.id === campaignGroupId);
    if (!recipientGroup) {
      toast.error("Invalid recipient group selected");
      return;
    }

    setSubmittingCampaign(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: campaignTitle,
          body: campaignBody,
          targetType: campaignTargetType,
          recipientGroupId: campaignGroupId,
          recipientGroupName: recipientGroup.name,
          status: statusToSet,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      toast.success(
        statusToSet === "sent"
          ? `Campaign sent successfully to ${data.campaign.sent_count} users!`
          : "Campaign draft saved!"
      );
      setIsCampaignDialogOpen(false);
      // reset form
      setCampaignTitle("");
      setCampaignBody("");
      setCampaignGroupId("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Error: " + err.message);
    } finally {
      setSubmittingCampaign(false);
    }
  };

  // Group Create handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setSubmittingGroup(true);
    try {
      const res = await fetch("/api/admin/user-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: groupName,
          description: groupDescription,
          userIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");

      toast.success(`User group "${groupName}" created successfully!`);
      setIsGroupDialogOpen(false);
      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedUserIds([]);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Error: " + err.message);
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the group "${name}"?`)) return;

    try {
      const res = await fetch("/api/admin/user-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          groupId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete group");
      }

      toast.success("Group deleted successfully");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Search filters for dropdowns
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredCompaniesForFilter = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredGroupsList = groups.filter((g) =>
    g.name.toLowerCase().includes(groupsListSearch.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(groupsListSearch.toLowerCase())
  );

  // Filter users list dynamically for custom group selector
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(groupSearchTerm.toLowerCase());

    const matchesCompany = filterCompanyId === "all" || u.company?.id === filterCompanyId;
    const matchesVerified = !filterVerified || u.is_verified;

    return matchesSearch && matchesCompany && matchesVerified;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    setSelectedUserIds((prev) => {
      const added = filteredIds.filter((id) => !prev.includes(id));
      return [...prev, ...added];
    });
  };

  const handleClearAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Campaign Table (Col span 7) */}
        <div className="xl:col-span-8 bg-white border border-neutral-200/70 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <div>
              <h3 className="text-lg font-bold text-neutral-950">Campaign History</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Logs of emails and notifications sent to users.</p>
            </div>
            <Button
              onClick={() => setIsCampaignDialogOpen(true)}
              className="flex items-center gap-1 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold rounded-lg h-9 px-3.5"
            >
              <Plus className="h-4 w-4" /> Create Campaign
            </Button>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="py-20 flex justify-center items-center text-sm text-neutral-400">Loading campaign logs...</div>
            ) : campaigns.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <FileText className="h-10 w-10 text-neutral-300 mb-3" />
                <h4 className="font-bold text-neutral-800">No campaigns found</h4>
                <p className="text-xs text-neutral-500 max-w-xs mt-1">Create your first email or notification campaign to reach your users.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Campaign Name / Subject</th>
                    <th className="px-6 py-3.5">Channel</th>
                    <th className="px-6 py-3.5">Recipient Group</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-center">Delivered</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-neutral-900 max-w-xs truncate" title={c.title}>
                        {c.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1">
                          {c.target_type === "email" ? (
                            <>
                              <Mail className="h-3.5 w-3.5 text-indigo-500" /> Email
                            </>
                          ) : (
                            <>
                              <Bell className="h-3.5 w-3.5 text-emerald-500" /> In-App
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 truncate max-w-[150px]" title={c.recipient_group_name}>
                        {c.recipient_group_name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant="secondary"
                          className={`font-semibold capitalize text-[10px] rounded-full px-2 py-0.5 ${
                            c.status === "sent"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : c.status === "sending"
                              ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                              : c.status === "failed"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-neutral-50 text-neutral-700 border-neutral-200"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-neutral-800">
                        {c.sent_count}
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* User Groups Table (Col span 5) */}
        <div className="xl:col-span-4 bg-white border border-neutral-200/70 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <div>
              <h3 className="text-lg font-bold text-neutral-950">User Groups</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Manage system and custom recipient list groupings.</p>
            </div>
            <Button
              onClick={() => setIsGroupDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-1 text-neutral-700 border-neutral-200 text-xs font-bold rounded-lg h-9 px-3 hover:bg-neutral-50"
            >
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </div>
          {/* Search groups bar */}
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search user groups..."
                value={groupsListSearch}
                onChange={(e) => setGroupsListSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-neutral-200 bg-white focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="py-20 flex justify-center items-center text-sm text-neutral-400">Loading groups...</div>
            ) : filteredGroupsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">No user groups found</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredGroupsList.map((g) => (
                  <div key={g.id} className="p-5 hover:bg-neutral-50/40 transition-colors flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-neutral-900 text-sm leading-none">{g.name}</h4>
                        {g.is_system ? (
                          <Badge className="bg-neutral-100 text-neutral-600 hover:bg-neutral-100 border-none text-[9px] font-bold py-0 px-1.5 h-4">
                            Default
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border-none text-[9px] font-bold py-0 px-1.5 h-4">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-neutral-500 text-[11px] leading-normal">{g.description}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/50">
                        <Users className="h-3 w-3" /> {g.member_count} active users
                      </span>
                    </div>

                    {!g.is_system && (
                      <Button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        size="icon"
                        variant="ghost"
                        className="text-neutral-400 hover:text-red-600 h-8 w-8 hover:bg-red-50 rounded-lg self-center shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* dialog for Campaign Creator */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 border shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-neutral-950 flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-600" /> Create Announcement Campaign
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* 1. Channel Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-700">Delivery Channel</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignTargetType("notification");
                    // plain text notification resets body html
                    setCampaignBody("");
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    campaignTargetType === "notification"
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-100 hover:border-neutral-200"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900">In-App Notification</h5>
                    <p className="text-[11px] text-neutral-500">Short message, triggers mobile & web push alerts</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaignTargetType("email")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    campaignTargetType === "email"
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-100 hover:border-neutral-200"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900">Email Campaign</h5>
                    <p className="text-[11px] text-neutral-500">Rich HTML email sent directly via SES / SMTP</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Recipient Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="campaign-group" className="text-xs font-bold text-neutral-700">Recipient Group</Label>
                <Popover open={isGroupComboOpen} onOpenChange={setIsGroupComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="campaign-group"
                      variant="outline"
                      role="combobox"
                      aria-expanded={isGroupComboOpen}
                      className="w-full justify-between h-10 border-neutral-200 text-xs text-neutral-700 bg-white hover:bg-neutral-50/50 hover:text-neutral-900 rounded-lg px-3 font-normal"
                    >
                      <span className="truncate">
                        {campaignGroupId
                          ? groups.find((g) => g.id === campaignGroupId)?.name
                          : "Select target group..."}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-2 bg-white border border-neutral-200 shadow-lg rounded-xl z-50">
                    <div className="flex items-center border-b border-neutral-100 pb-2 mb-2">
                      <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search group..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="h-8 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs px-0"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                      {filteredGroups.length === 0 ? (
                        <div className="text-neutral-400 text-xs py-4 text-center">No group found.</div>
                      ) : (
                        filteredGroups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setCampaignGroupId(g.id);
                              setIsGroupComboOpen(false);
                              setGroupSearch("");
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-neutral-50 flex items-center justify-between ${
                              campaignGroupId === g.id ? "bg-indigo-50/50 text-indigo-700 font-semibold" : "text-neutral-700"
                            }`}
                          >
                            <span className="truncate">{g.name}</span>
                            <span className="text-[10px] text-neutral-400 font-normal shrink-0 ml-2">({g.member_count} users)</span>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {campaignTargetType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="template-select" className="text-xs font-bold text-neutral-700">Predefined Layout Template</Label>
                  <Select onValueChange={handleSelectTemplate} defaultValue="custom">
                    <SelectTrigger id="template-select" className="h-10 rounded-lg border-neutral-200">
                      <SelectValue placeholder="Custom layout (blank)..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-md">
                      <SelectItem value="custom" className="text-xs py-2">Custom (Blank Canvas)</SelectItem>
                      <SelectItem value="welcome" className="text-xs py-2">Welcome Onboarding Email</SelectItem>
                      <SelectItem value="update" className="text-xs py-2">Weekly Platform Update</SelectItem>
                      <SelectItem value="announcement" className="text-xs py-2">Important Announcement Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 3. Title / Subject */}
            <div className="space-y-2">
              <Label htmlFor="campaign-title" className="text-xs font-bold text-neutral-700">
                {campaignTargetType === "email" ? "Email Subject Line" : "Notification Title Header"}
              </Label>
              <Input
                id="campaign-title"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder={campaignTargetType === "email" ? "e.g. Welcome to Vouchins Network!" : "e.g. Database scheduled maintenance notice"}
                className="h-10 rounded-lg border-neutral-200"
              />
            </div>

            {/* 4. Body Content (Adapts depending on type) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-700">
                {campaignTargetType === "email" ? "Email Body (HTML Rich Text)" : "Notification Message Content"}
              </Label>

              {campaignTargetType === "notification" ? (
                <div className="space-y-1">
                  <Textarea
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value.slice(0, 160))}
                    placeholder="Type the short message alert here (max 160 characters)..."
                    className="min-h-[80px] rounded-lg border-neutral-200 text-xs"
                  />
                  <p className="text-[10px] text-neutral-400 font-bold text-right">
                    {campaignBody.length}/160 characters
                  </p>
                </div>
              ) : (
                /* visual HTML editor wrapper */
                <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
                  {/* Visual Editor Toolbar */}
                  <div className="bg-neutral-50 border-b border-neutral-100 p-2 flex flex-wrap gap-1 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("bold")}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("italic")}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("underline")}
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-[1px] bg-neutral-200 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("formatBlock", "h3")}
                      title="Heading"
                    >
                      <Heading className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("insertUnorderedList")}
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("insertOrderedList")}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={handleLinkCommand}
                      title="Insert Link"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-[1px] bg-neutral-200 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-neutral-200/50 rounded text-neutral-600"
                      onClick={() => execEditorCommand("removeFormat")}
                      title="Clear Formatting"
                    >
                      <RemoveFormatting className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Rich Text Editor ContentEditable Frame */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorInput}
                    placeholder="Compose your rich text email layout here..."
                    className="min-h-[220px] p-4 text-xs focus:outline-none overflow-y-auto prose max-w-none prose-sm"
                    style={{ minHeight: "220px" }}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 border-t border-neutral-100 pt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCampaignDialogOpen(false)}
                className="text-xs font-bold text-neutral-600 h-10"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submittingCampaign}
                onClick={() => handleCreateCampaign("draft")}
                className="text-xs font-bold text-neutral-700 border-neutral-200 hover:bg-neutral-50 h-10 px-4 rounded-lg"
              >
                {submittingCampaign ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                type="button"
                disabled={submittingCampaign}
                onClick={() => handleCreateCampaign("sent")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 h-10 rounded-lg flex items-center gap-1.5"
              >
                {submittingCampaign ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Send Immediately
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Custom Group Creator */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 border shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-neutral-950 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" /> Create Custom User Group
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-5">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="group-name" className="text-xs font-bold text-neutral-700">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Platform beta testers, Local members"
                  className="h-10 rounded-lg border-neutral-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="group-desc" className="text-xs font-bold text-neutral-700">Description</Label>
                <Input
                  id="group-desc"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Describe the purpose or filter rules of this group..."
                  className="h-10 rounded-lg border-neutral-200 text-xs"
                />
              </div>
            </div>

            {/* Selector Filter tools */}
            <div className="border border-neutral-200/80 rounded-xl overflow-hidden bg-white">
              <div className="bg-neutral-50 p-4 border-b border-neutral-200/50 space-y-3">
                <Label className="text-xs font-bold text-neutral-700">Filter Professionals List</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <Input
                      placeholder="Search name or email..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-lg border-neutral-200"
                    />
                  </div>

                  {/* Company filter */}
                  <Popover open={isCompanyComboOpen} onOpenChange={setIsCompanyComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isCompanyComboOpen}
                        className="w-full justify-between h-9 border-neutral-200 text-xs text-neutral-700 bg-white hover:bg-neutral-50/50 hover:text-neutral-900 rounded-lg px-3 font-normal"
                      >
                        <span className="truncate">
                          {filterCompanyId === "all"
                            ? "All Companies"
                            : companies.find((c) => c.id === filterCompanyId)?.name || "All Companies"}
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
                            setFilterCompanyId("all");
                            setIsCompanyComboOpen(false);
                            setCompanySearch("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-50 ${
                            filterCompanyId === "all" ? "bg-indigo-50/50 text-indigo-700 font-semibold" : "text-neutral-700"
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
                                setFilterCompanyId(c.id);
                                setIsCompanyComboOpen(false);
                                setCompanySearch("");
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-50 truncate ${
                                filterCompanyId === c.id ? "bg-indigo-50/50 text-indigo-700 font-semibold" : "text-neutral-700"
                              }`}
                            >
                              {c.name}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Verification filter */}
                  <div className="flex items-center gap-2 bg-white px-3 rounded-lg border border-neutral-200 h-9">
                    <input
                      type="checkbox"
                      id="filter-verified"
                      checked={filterVerified}
                      onChange={(e) => setFilterVerified(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <Label htmlFor="filter-verified" className="text-[11px] font-bold text-neutral-600 cursor-pointer">
                      Verified only
                    </Label>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-neutral-500 font-semibold">
                    Showing {filteredUsers.length} of {users.length} users ({selectedUserIds.length} selected)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllFiltered}
                      className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50/50 h-7"
                    >
                      Select All Filtered
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllFiltered}
                      className="text-[10px] font-bold text-neutral-500 hover:bg-neutral-100 h-7"
                    >
                      Clear Filtered
                    </Button>
                  </div>
                </div>
              </div>

              {/* Users list scroller */}
              <div className="divide-y divide-neutral-100 max-h-[220px] overflow-y-auto p-2">
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">No users match the active filters</div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors ${
                          isSelected ? "bg-neutral-50/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <h6 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                              {u.full_name}
                              {u.is_verified && (
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-50/30" />
                              )}
                            </h6>
                            <p className="text-[10px] text-neutral-500 font-semibold">{u.email}</p>
                          </div>
                        </div>

                        {u.company && (
                          <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100/70 border px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Building className="h-3 w-3" /> {u.company.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-neutral-100 pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsGroupDialogOpen(false)}
                className="text-xs font-bold text-neutral-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingGroup}
                className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold px-4 h-10 rounded-lg"
              >
                {submittingGroup ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
