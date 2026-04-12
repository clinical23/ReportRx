"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw } from "lucide-react";

import {
  setTeamMemberActiveStatus,
  updateTeamMemberDetails,
  updateTeamMemberRoleClient,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import type { TeamMemberRow } from "@/lib/supabase/data";

type Props = {
  member: TeamMemberRow;
  viewerRole: string;
  viewerUserId: string;
};

const ROLE_OPTIONS_BASE = [
  { value: "clinician", label: "Clinician" },
  { value: "manager", label: "Manager" },
  { value: "practice_manager", label: "Practice manager" },
  { value: "pcn_manager", label: "PCN manager" },
  { value: "admin", label: "Admin" },
] as const;

export function TeamMemberAdminActions({
  member,
  viewerRole,
  viewerUserId,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [fullName, setFullName] = useState(member.full_name);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState(member.role);

  const canManage = viewerRole === "admin" || viewerRole === "superadmin";
  if (!canManage) return null;

  const isSelf = member.id === viewerUserId;

  const cannotEditTarget =
    isSelf || (viewerRole === "admin" && member.role === "superadmin");

  const roleOptions =
    viewerRole === "superadmin"
      ? [...ROLE_OPTIONS_BASE, { value: "superadmin", label: "Superadmin" }]
      : ROLE_OPTIONS_BASE;

  const openEdit = () => {
    if (cannotEditTarget) {
      toast.error("You cannot edit a superadmin user.");
      return;
    }
    setFullName(member.full_name);
    setEmail(member.email);
    setRole(member.role);
    setEditOpen(true);
  };

  const saveEdit = () => {
    startTransition(async () => {
      const d = await updateTeamMemberDetails({
        userId: member.id,
        fullName,
        email,
      });
      if (!d.success) {
        toast.error(d.error ?? "Could not save profile.");
        return;
      }
      if (role !== member.role) {
        const r = await updateTeamMemberRoleClient({
          userId: member.id,
          newRole: role,
        });
        if (!r.success) {
          toast.error(r.error ?? "Could not update role.");
          return;
        }
      }
      toast.success("Team member updated.");
      setEditOpen(false);
      router.refresh();
    });
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
          disabled={pending || cannotEditTarget}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-600">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={pending}
              onClick={saveEdit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
