"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { ShieldCheck, User, Linkedin, Phone, ChevronRight, CheckCircle2 } from "lucide-react";
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog";

export function ProfileCompletionWidget({ className = "" }: { className?: string }) {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState("avatar");

  if (!user || user.is_profile_complete) return null;

  const checklist = [
    {
      id: "avatar",
      label: "Add Profile Picture",
      isComplete: !!user.avatar_url,
      icon: User,
    },
    {
      id: "linkedin",
      label: "Add LinkedIn URL",
      isComplete: !!user.linkedin_url,
      icon: Linkedin,
    },
    {
      id: "phone",
      label: "Add Phone Number",
      isComplete: !!user.phone_number,
      icon: Phone,
    },
    {
      id: "verified",
      label: "Verify Company Email",
      isComplete: user.is_verified,
      icon: ShieldCheck,
    },
  ];

  const handleOpenDialog = (tabId: string) => {
    setDialogTab(tabId);
    setIsDialogOpen(true);
  };

  const handleCompleteClick = () => {
    // Open the first incomplete tab, or "avatar" by default
    const firstIncomplete = checklist.find((item) => !item.isComplete);
    handleOpenDialog(firstIncomplete ? firstIncomplete.id : "avatar");
  };

  return (
    <>
      <div className={`bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 ${className}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black text-neutral-900 tracking-tight">Complete Your Profile</h3>
            <p className="text-[11px] font-bold text-neutral-500 mt-1">Get 100 Trust Points!</p>
          </div>
          <span className="text-xl font-black text-primary">{user.profile_completion_percentage}%</span>
        </div>

        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${user.profile_completion_percentage}%` }}
          />
        </div>

        <ul className="space-y-2 mt-4">
          {checklist.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleOpenDialog(item.id)}
                className="w-full flex items-center justify-between text-sm py-1 hover:bg-neutral-50 rounded-lg px-2 -mx-2 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center h-5 w-5 rounded-full shrink-0 ${item.isComplete ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-400'}`}>
                    {item.isComplete ? <CheckCircle2 className="h-3 w-3" /> : <item.icon className="h-2.5 w-2.5" />}
                  </div>
                  <span className={`text-[11px] font-bold ${item.isComplete ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
                    {item.label}
                  </span>
                </div>
                {!item.isComplete && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    +25 pts
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={handleCompleteClick}
          className="w-full mt-4 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          Complete Profile <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <ProfileCompletionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialTab={dialogTab}
      />
    </>
  );
}

