import { TasksView } from "@/components/tasks/tasks-view";
import { getClinicians, listTasksWithClinicians } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, clinicians] = await Promise.all([
    listTasksWithClinicians(),
    getClinicians(),
  ]);

  return <TasksView tasks={tasks} clinicians={clinicians} />;
}
