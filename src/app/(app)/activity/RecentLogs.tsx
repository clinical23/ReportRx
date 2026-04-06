import { formatDateMediumUK } from '@/lib/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type GroupedRecentLog = {
  log_id: string
  log_date: string
  hours_worked: number | null
  clinician_name: string
  practice_name: string
  entries: { category_name: string; count: number }[]
}

export default function RecentLogs({ logs }: { logs: GroupedRecentLog[] }) {
  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => {
          const appointmentTotal = log.entries.reduce((s, e) => s + e.count, 0)
          const categoryLabel =
            log.entries.length > 0
              ? log.entries
                  .map((e) =>
                    e.count > 1 ? `${e.category_name} (${e.count})` : e.category_name,
                  )
                  .join(' · ')
              : 'Uncategorised'

          return (
            <div
              key={log.log_id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-foreground">{categoryLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {log.clinician_name || 'Unknown clinician'}
                  {log.practice_name ? ` · ${log.practice_name}` : ''}
                </div>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                <div>{formatDateMediumUK(log.log_date)}</div>
                <div>
                  {appointmentTotal} appts
                  {log.hours_worked != null && log.hours_worked > 0
                    ? ` · ${log.hours_worked} hrs`
                    : ''}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
