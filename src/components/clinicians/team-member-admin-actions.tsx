"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw } from "lucide-react";

import { setTeamMemberActiveStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import type { TeamMemberEditTab } from "@/components/clinicians/team-member-edit-dialog";
import type { TeamMemberRow } from "@/lib/supabase/data";

type Props = {
  member: TeamMemberRow;
  viewerRole: string;
  viewerUserId: string;
  onOpenEdit?: (tab: TeamMemberEditTab) => void;
};

export function TeamMemberAdminActions({
  member,
  viewerRole,
  viewerUserId,
  onOpenEdit,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const canManage = viewerRole === "admin" || viewerRole === "superadmin";
  if (!canManage) return null;

  const isSelf = member.id === viewerUserId;

  const cannotEditTarget =
    isSelf || (viewerRole === "admin" && member.role === "superadmin");

  const openEdit = () => {
    if (cannotEditTarget) {
      toast.error("You cannot edit a superadmin user.");
      return;
    }
    onOpenEdit?.("basic");
  };

  const confirmDeactivate = () => {
    startTransition(async () => {
      const r = await setTeamMemberActiveStatus({
        userId: member.id,
        makeActive: false,
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not deactivate.");
        return;
      }
      toast.success(`${member.full_name} has been deactivated.`);
      setDeactivateOpen(false);
      router.refresh();
    });
  };

  const reactivate = () => {
    startTransition(async () => {
      const r = await setTeamMemberActiveStatus({
        userId: member.id,
        makeActive: true,
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not reactivate.");
        return;
      }
      toast.success(`${member.full_name} has been reactivated.`);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={pending || cannotEditTarget || !onOpenEdit}
          onClick={openEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {member.is_active ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-red-700 hover:bg-red-50"
            disabled={pending || cannotEditTarget}
            onClick={() => setDeactivateOpen(true)}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            disabled={pending || cannotEditTarget}
            onClick={reactivate}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate {member.full_name}? They will be signed out
            immediately and cannot sign in until reactivated.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={pending}
              onClick={confirmDeactivate}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
