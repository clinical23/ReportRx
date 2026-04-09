"use client";

import { useState, useTransition } from "react";

import {
  bulkSaveActivityLogs,
  addActivityCategory,
  saveActivityLog,
} from "@/app/actions/activity";
import { Button } from "@/components/ui/button";
import type { ActivityCategory } from "@/lib/supabase/activity";
import type { ClinicianListItem } from "@/lib/supabase/data";
import { todayISOInLondon } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type Practice = { id: string; name: string };

type Props = {
  clinicians: ClinicianListItem[];
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

/** 16px+ on mobile to reduce iOS zoom; compact on md+ */
const controlClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 shadow-sm md:py-2.5 md:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const stepperBtnClass =
  "flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-xl font-semibold leading-none text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100";

const countInputClass =
  "h-12 w-full min-w-0 max-w-[5.5rem] rounded-lg border border-gray-200 bg-white px-2 text-center text-lg tabular-nums text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-9 md:max-w-[5rem] md:text-sm";

function CategoryStepperRow({
  cat,
  map,
  setMap,
  onCountChange,
}: {
  cat: ActivityCategory;
  map: CountMap;
  setMap: (m: CountMap) => void;
  onCountChange: (
    map: CountMap,
    setMap: (m: CountMap) => void,
    id: string,
    val: string,
  ) => void;
}) {
  const raw = map[cat.id];
  const display = raw === undefined || raw === 0 ? "" : String(raw);

  const applyDelta = (delta: number) => {
    const cur = map[cat.id] ?? 0;
    setMap({ ...map, [cat.id]: Math.max(0, cur + delta) });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <span className="min-w-0 text-base font-medium text-gray-900 md:text-sm">
        {cat.name}
      </span>
      <div className="flex items-center justify-center gap-2 md:justify-end">
        <button
          type="button"
          className={stepperBtnClass}
          onClick={() => applyDelta(-1)}
          aria-label={`Decrease ${cat.name} count`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={display}
          placeholder="0"
          onChange={(e) => onCountChange(map, setMap, cat.id, e.target.value)}
          className={countInputClass}
        />
        <button
          type="button"
          className={stepperBtnClass}
          onClick={() => applyDelta(1)}
          aria-label={`Increase ${cat.name} count`}
        >
          +
        </button>
      </div>
    </div>
  );
}

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
      : (scopedPractices[0]?.id ?? "");

  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [categories, setCategories] = useState(initialCategories);

  const [clinicianId, setClinicianId] = useState(
    variant === "clinician"
      ? (clinicianRecordId ?? "")
      : (clinicians[0]?.id ?? ""),
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
    val: string,
  ) {
    setMap({ ...map, [id]: Math.max(0, parseInt(val, 10) || 0) });
  }

  function toggleBulkClinician(id: string) {
    setBulkClinicianIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
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
    <div className="min-w-0">
      {showBulkTab ? (
        <div className="mb-6 flex w-full rounded-full border border-gray-200 bg-gray-100/90 p-1 shadow-sm md:inline-flex md:w-auto">
          {(["single", "bulk"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full px-4 py-3 text-base font-medium transition-all md:flex-initial md:py-2 md:text-sm",
                tab === t
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {t === "single" ? "Log activity" : "Bulk assign (manager)"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Log activity</h2>
          <p className="mt-0.5 text-xs font-normal text-gray-600">
            Record your appointments for the selected day.
          </p>
        </div>
      )}

      {message ? (
        <div
          className={cn(
            "mb-4 rounded-xl border px-4 py-3 text-sm md:text-sm",
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {message.text}
        </div>
      ) : null}

      {tab === "single" && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 pb-28 shadow-sm sm:p-6 md:pb-6">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Clinician
                </label>
                {clinicianLocked ? (
                  <p className="py-3 text-base font-medium text-gray-900 md:py-2.5 md:text-sm">
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
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
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
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
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

            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Appointment categories
            </p>
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              {categories.map((cat) => (
                <CategoryStepperRow
                  key={cat.id}
                  cat={cat}
                  map={counts}
                  setMap={setCounts}
                  onCountChange={handleCount}
                />
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
                  className={cn(controlClass, "min-w-0 flex-1")}
                />
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 px-4 text-base md:h-9 md:text-sm"
                  onClick={handleAddCategory}
                  disabled={isPending || !newCatName.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-base md:h-9 md:text-sm"
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
                className="mb-4 h-auto min-h-11 px-0 text-base text-primary hover:bg-transparent hover:text-primary/90 md:min-h-0 md:text-sm"
                onClick={() => setShowNewCat(true)}
              >
                + Add category
              </Button>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Hours worked
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-lg tabular-nums text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-auto md:w-24 md:py-2 md:text-sm"
              />
            </div>

            <div className="mt-6 hidden flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 md:flex">
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
                className="bg-teal-600 text-white hover:bg-teal-700"
                onClick={handleSingle}
                disabled={isPending || !canSaveSingle}
              >
                {isPending ? "Saving…" : "Save entry"}
              </Button>
            </div>

            <div className="mt-4 md:hidden">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={() => {
                  setCounts({});
                  setMessage(null);
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
            <Button
              type="button"
              className="h-auto w-full bg-teal-600 py-4 text-base font-medium text-white hover:bg-teal-700"
              onClick={handleSingle}
              disabled={isPending || !canSaveSingle}
            >
              {isPending ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </>
      )}

      {showBulkTab && tab === "bulk" && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 pb-28 shadow-sm sm:p-6 md:pb-6">
            <p className="mb-5 text-base text-gray-600 md:text-sm">
              Select multiple clinicians — the same activity counts will be saved
              for each.
            </p>

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Clinicians
            </p>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {clinicians.map((c) => (
                <label
                  key={c.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
                    bulkClinicianIds.includes(c.id)
                      ? "border-teal-300 bg-teal-50/50 shadow-sm"
                      : "border-gray-200 bg-gray-50/30 hover:border-gray-300",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={bulkClinicianIds.includes(c.id)}
                    onChange={() => toggleBulkClinician(c.id)}
                    className="size-5 rounded border-gray-300"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-gray-900 md:text-sm">
                      {c.name}
                    </p>
                    <p className="text-sm text-gray-500 md:text-xs">{c.role}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
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
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Date
                </label>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className={controlClass}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Hours worked
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  value={bulkHours}
                  onChange={(e) => setBulkHours(e.target.value)}
                  className={cn(controlClass, "text-center md:text-left")}
                />
              </div>
            </div>

            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Appointment categories
            </p>
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              {categories.map((cat) => (
                <CategoryStepperRow
                  key={cat.id}
                  cat={cat}
                  map={bulkCounts}
                  setMap={setBulkCounts}
                  onCountChange={handleCount}
                />
              ))}
            </div>

            <div className="mt-6 hidden flex-col gap-3 border-t border-gray-100 pt-5 md:flex md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                {bulkClinicianIds.length === 0
                  ? "No clinicians selected"
                  : `${bulkClinicianIds.length} clinician(s) selected`}
              </p>
              <Button
                type="button"
                className="bg-teal-600 text-white hover:bg-teal-700"
                onClick={handleBulk}
                disabled={isPending || bulkClinicianIds.length === 0}
              >
                {isPending
                  ? "Saving…"
                  : `Save for ${bulkClinicianIds.length || "—"} clinician(s)`}
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600 md:hidden">
              {bulkClinicianIds.length === 0
                ? "No clinicians selected"
                : `${bulkClinicianIds.length} clinician(s) selected`}
            </p>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
            <Button
              type="button"
              className="h-auto w-full bg-teal-600 py-4 text-base font-medium text-white hover:bg-teal-700"
              onClick={handleBulk}
              disabled={isPending || bulkClinicianIds.length === 0}
            >
              {isPending
                ? "Saving…"
                : `Save for ${bulkClinicianIds.length || "—"} clinician(s)`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
