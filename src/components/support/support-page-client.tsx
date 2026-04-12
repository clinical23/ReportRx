"use client";

import { useRef, useState, type FormEvent } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { SUPPORT_CATEGORIES } from "@/lib/support-email";
import { cn } from "@/lib/utils";

const selectCls = cn(
  "flex h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:text-sm",
);

const faqItems: { q: string; a: string }[] = [
  {
    q: "I didn't receive the invite email",
    a: "Check your Junk/Spam folder. The email comes from noreply@reportrx.co.uk. If it is still missing, ask your administrator to resend the invite or confirm your email address is correct.",
  },
  {
    q: "The magic link says it's expired",
    a: "Magic links expire after 1 hour. Go to reportrx.co.uk and request a new one from the sign-in page.",
  },
  {
    q: "I can't see my practices in the Activity form",
    a: "Your admin needs to assign you to practices first. Contact your manager or organisation administrator to check your practice access.",
  },
  {
    q: "How do I set up two-factor authentication?",
    a: "Go to Settings, scroll to Two-Factor Authentication, and follow the step-by-step guide.",
  },
  {
    q: "I logged activity for the wrong date",
    a: "Go to Activity, find the entry in Recent entries, and click Edit to correct it.",
  },
  {
    q: "I was signed out unexpectedly",
    a: "For security, ReportRx signs you out after 15 minutes of inactivity. Sign in again to continue.",
  },
];

export function SupportPageClient() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateFile(file: File | null) {
    setFileError(null);
    if (!file || file.size === 0) return true;
    const okTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!okTypes.includes(file.type)) {
      setFileError("Please choose a JPG, PNG, or WebP image.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Screenshot must be 5MB or smaller.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Please enter a message of at least 10 characters.");
      return;
    }
    const file = fileInputRef.current?.files?.[0] ?? null;
    if (!validateFile(file)) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("category", category);
      fd.append("subject", subject.trim());
      fd.append("message", message.trim());
      if (file && file.size > 0) fd.append("screenshot", file);

      const res = await fetch("/api/support", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        toast.error(
          body.error ??
            "Could not send your support request. Please try again.",
        );
        return;
      }

      toast.success(
        "Support request sent — we'll get back to you soon.",
      );
      setSubject("");
      setMessage("");
      setCategory(SUPPORT_CATEGORIES[0]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileError(null);
    } catch {
      toast.error(
        "Could not send your support request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Support
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Get help with ReportRx. We&apos;ll get back to you as soon as
          possible.
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-white">
          <CardTitle className="text-lg">Contact us</CardTitle>
          <CardDescription>
            Your name and email are attached automatically from your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="support-category">Category</Label>
              <select
                id="support-category"
                name="category"
                value={category}
                onChange={(ev) => setCategory(ev.target.value)}
                className={selectCls}
                required
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary"
                maxLength={200}
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue (at least 10 characters)"
                required
                minLength={10}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-screenshot">
                Screenshot{" "}
                <span className="font-normal text-gray-500">(optional)</span>
              </Label>
              <Input
                ref={fileInputRef}
                id="support-screenshot"
                name="screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-800"
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null;
                  validateFile(f);
                }}
              />
              {fileError ? (
                <p className="text-sm text-red-600">{fileError}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  JPG, PNG, or WebP. Maximum 5MB.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
          {faqItems.map((item, i) => (
            <AccordionItem value={`faq-${i}`} key={item.q}>
              <AccordionTrigger className="text-left">
                {item.q}
              </AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
