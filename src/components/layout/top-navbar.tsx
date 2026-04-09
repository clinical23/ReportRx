"use client";

import { ChevronDown, ChevronRight, User } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  practiceName: string;
  userDisplayName: string;
  userEmail: string;
  initials: string;
};

export function TopNavbar({
  practiceName,
  userDisplayName,
  userEmail,
  initials,
}: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div
        className="flex min-w-0 items-center gap-1.5 text-sm"
        aria-label="Current practice"
      >
        <span className="hidden text-slate-500 sm:inline">Practice</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:inline" />
        <span className="truncate font-semibold text-slate-800">
          {practiceName}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Avatar className="h-8 w-8 ring-2 ring-slate-100">
              <AvatarFallback className="bg-teal-100 text-xs font-semibold text-teal-800">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[12rem] truncate text-sm font-medium text-slate-800 sm:inline">
              {userDisplayName}
            </span>
            <ChevronDown className="size-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 rounded-xl border border-slate-200 p-1 shadow-md"
        >
          <DropdownMenuLabel className="space-y-1 px-3 py-2 font-normal">
            <p className="text-sm font-semibold text-slate-800">
              {userDisplayName}
            </p>
            {userEmail ? (
              <p className="text-xs text-slate-500">{userEmail}</p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-100" />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2">
            <Link href="/settings" className="flex items-center gap-2">
              <User className="size-4 text-slate-500" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
