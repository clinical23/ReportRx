"use client";

import { useState, useTransition } from "react";

import { bulkSaveActivityLogs, addActivityCategory, saveActivityLog } from "@/app/actions/activity";
import { Button } from "@/components/ui/button";
import type { ActivityCategory } from "@/lib/supabase/activity";
import { todayISOInLondon } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type Clinician = { id: string; name: string; role: string };
type Practice = { id: string; name: string };

type Props = {
  clinicians: Clinician[];
  practices: Practice[];
  categories: ActivityCategory[];
  /** Clinician users: single tab, locked identity. Managers: both tabs. */
  variant: "clinician" | "manager";
  /** Resolved `clinicians.id` for this user when variant is clinician */
  clinicianRecordId: string | null;
  /** Shown when clinician selector is hidden */
  clinicianDisplayName: string;
  /** Initial practice from profile.practice_id */
  defaultPracticeId: string | null;
};

type CountMap = Record<string, number>;

const controlClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const numInputClass =
  "w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm tabular-nums shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function ActivityLogForm({
  clinicians,
  practices,
  categories: initialCategories,
  variant,
  clinicianRecordId,
  clinicianDisplayName,
  defaultPracticeId,
}: Props) {
  const scopedPractices =
    variant === "clinician" &&
    defaultPracticeId &&
    practices.some((p) => p.id === defaultPracticeId)
      ? practices.filter((p) => p.id === defaultPracticeId)
      : practices;

  const initialPractice =
    defaultPracticeId && scopedPractices.some((p) => p.id === defaultPracticeId)
      ? defaultPracticeId
      : scopedPractices[0]?.id ?? "";

  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [categories, setCategories] = useState(initialCategories);

  const [clinicianId, setClinicianId] = useState(
    variant === "clinician"
      ? (clinicianRecordId ?? "")
      : (clinicians[0]?.id ?? "")
  );
  const [practiceId, setPracticeId] = useState(initialPractice);
  const [logDate, setLogDate] = useState(todayISOInLondon());
  const [hours, setHours] = useState<string>("7.5");
  const [counts, setCounts] = useState<CountMap>({});

  const [bulkClinicianIds, setBulkClinicianIds] = useState<string[]>([]);
  const [bulkPracticeId, setBulkPracticeId] = useState(initialPractice);
  const [bulkDate, setBulkDate] = useState(todayISOInLondon());
  const [bulkHours, setBulkHours] = useState<string>("7.5");
  const [bulkCounts, setBulkCounts] = useState<CountMap>({});

  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const clinicianLocked = variant === "clinician";
  const canSaveSingle =
    !clinicianLocked ||
    (clinicianRecordId != null && clinicianRecordId !== "");

  function handleCount(
    map: CountMap,
    setMap: (m: CountMap) => void,
    id: string,
    val: string
  ) {
    setMap({ ...map, [id]: Math.max(0, parseInt(val) || 0) });
  }

  function toggleBulkClinician(id: string) {
    setBulkClinicianIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function buildEntries(map: CountMap) {
    return categories.map((c) => ({
      category_id: c.id,
      count: map[c.id] ?? 0,
    }));
  }

  function handleSingle() {
    startTransition(async () => {
      setMessage(null);
      const cid = clinicianLocked ? (clinicianRecordId ?? "") : clinicianId;
      if (!cid) {
        setMessage({
          type: "error",
          text: "Your account is not linked to a clinician record (profiles.clinician_id). Contact an administrator.",
        });
        return;
      }
      const result = await saveActivityLog({
        clinician_id: cid,
        practice_id: practiceId,
        log_date: logDate,
        hours_worked: parseFloat(hours) || null,
        entries: buildEntries(counts),
      });
      if (result.success) {
        setMessage({ type: "success", text: "Activity log saved." });
        setCounts({});
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  function handleBulk() {
    startTransition(async () => {
      setMessage(null);
      const result = await bulkSaveActivityLogs({
        clinician_ids: bulkClinicianIds,
        practice_id: bulkPracticeId,
        log_date: bulkDate,
        hours_worked: parseFloat(bulkHours) || null,
        entries: buildEntries(bulkCounts),
      });
      if (result.success) {
        setMessage({
          type: "success",
          text: `Saved logs for ${result.count} clinician(s).`,
        });
        setBulkCounts({});
        setBulkClinicianIds([]);
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  function handleAddCategory() {
    startTransition(async () => {
      const result = await addActivityCategory(newCatName);
      if (result.success) {
        setCategories((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: newCatName.trim(),
            sort_order: prev.length + 1,
          },
        ]);
        setNewCatName("");
        setShowNewCat(false);
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Failed to add category.",
        });
      }
    });
  }

  const showBulkTab = variant === "manager";

  return (
    <div>
      {showBulkTab ? (
        <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-sm">
          {(["single", "bulk"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                tab === t
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t === "single" ? "Log activity" : "Bulk assign (manager)"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Log activity</h2>
          <p className="mt-0.5 text-xs font-normal text-slate-600">
            Record your appointments for the selected day.
          </p>
        </div>
      )}

      {message ? (
        <div
          className={cn(
            "mb-4 rounded-xl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {message.text}
        </div>
      ) : null}

      {tab === "single" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Clinician
              </label>
              {clinicianLocked ? (
                <p className="py-2.5 text-sm font-medium text-slate-800">
                  {clinicianDisplayName}
                </p>
              ) : (
                <select
                  value={clinicianId}
                  onChange={(e) => setClinicianId(e.target.value)}
                  className={controlClass}
                >
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Practice
              </label>
              <select
                value={practiceId}
                onChange={(e) => setPracticeId(e.target.value)}
                className={controlClass}
              >
                {scopedPractices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className={controlClass}
              />
            </div>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Appointment categories
          </p>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-slate-800">
                  {cat.name}
                </span>
                <input
                  type="number"
                  min={0}
                  value={counts[cat.id] ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    handleCount(counts, setCounts, cat.id, e.target.value)
                  }
                  className={cn(numInputClass, "sm:w-20")}
                />
              </div>
            ))}
          </div>

          {showNewCat ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className={cn(controlClass, "min-w-[8rem] flex-1")}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddCategory}
                disabled={isPending || !newCatName.trim()}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCat(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 h-auto px-0 text-primary hover:bg-transparent hover:text-primary/90"
              onClick={() => setShowNewCat(true)}
            >
              + Add category
            </Button>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Hours worked
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={cn(
                "w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm tabular-nums shadow-sm",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCounts({});
                setMessage(null);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleSingle}
              disabled={isPending || !canSaveSingle}
            >
              {isPending ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </div>
      )}

      {showBulkTab && tab === "bulk" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-5 text-sm text-slate-600">
            Select multiple clinicians — the same activity counts will be saved for
            each.
          </p>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Clinicians
          </p>
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {clinicians.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
                  bulkClinicianIds.includes(c.id)
                    ? "border-teal-300 bg-teal-50/50 shadow-sm"
                    : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={bulkClinicianIds.includes(c.id)}
                  onChange={() => toggleBulkClinician(c.id)}
                  className="rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.role}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Practice
              </label>
              <select
                value={bulkPracticeId}
                onChange={(e) => setBulkPracticeId(e.target.value)}
                className={controlClass}
              >
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Date
              </label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className={controlClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Hours worked
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={bulkHours}
                onChange={(e) => setBulkHours(e.target.value)}
                className={controlClass}
              />
            </div>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Appointment categories
          </p>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-slate-800">
                  {cat.name}
                </span>
                <input
                  type="number"
                  min={0}
                  value={bulkCounts[cat.id] ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    handleCount(bulkCounts, setBulkCounts, cat.id, e.target.value)
                  }
                  className={cn(numInputClass, "sm:w-20")}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {bulkClinicianIds.length === 0
                ? "No clinicians selected"
                : `${bulkClinicianIds.length} clinician(s) selected`}
            </p>
            <Button
              type="button"
              onClick={handleBulk}
              disabled={isPending || bulkClinicianIds.length === 0}
            >
              {isPending
                ? "Saving…"
                : `Save for ${bulkClinicianIds.length || "—"} clinician(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
