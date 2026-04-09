import type {
  CategoryBreakdownItem,
  ClinicianBreakdownItem,
  PracticeBreakdownItem,
  ReportingSummary,
} from "@/lib/supabase/reporting";

export type MonthlyReportViewProps = {
  organisationName: string;
  periodLabel: string;
  generatedAtLabel: string;
  summary: ReportingSummary;
  practicesCovered: number;
  byCategory: CategoryBreakdownItem[];
  byPractice: PracticeBreakdownItem[];
  clinicianBreakdown: ClinicianBreakdownItem[];
};
