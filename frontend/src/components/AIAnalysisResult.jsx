import { CheckCircle2, CircleMinus, Lightbulb, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { cn } from '@/lib/utils.js'

function formatAnalysisDate(createdAt) {
  if (!createdAt) {
    return 'Date unavailable'
  }

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString()
}

const RESULT_TONES = {
  strength: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  missing: {
    icon: CircleMinus,
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  recommendation: {
    icon: Lightbulb,
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
}

function ResultList({ items, emptyMessage, tone }) {
  const toneConfig = RESULT_TONES[tone]
  const Icon = toneConfig.icon

  return items?.length > 0 ? (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>
          <Badge
            variant="outline"
            className={cn(
              'h-auto max-w-full items-start gap-1.5 py-1 whitespace-normal',
              toneConfig.className,
            )}
          >
            <Icon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  )
}

function AIAnalysisResult({ analysis }) {
  if (!analysis) {
    return null
  }

  return (
    <section aria-labelledby="analysis-result-heading">
      <Card className="gap-0 overflow-hidden border-primary/15 py-0 shadow-md shadow-primary/5">
        <CardHeader className="border-b bg-primary/[0.035] py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>
                <h2 id="analysis-result-heading">Analysis Result</h2>
              </CardTitle>
              <CardDescription>
                Created {formatAnalysisDate(analysis.created_at)}
              </CardDescription>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-primary/15 bg-background px-5 py-3 text-center shadow-sm sm:mt-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Match score
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
              <strong>Match score: {analysis.match_score}%</strong>
            </p>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 py-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-4 lg:col-span-2">
            <h3 className="mb-2 font-semibold">Summary</h3>
            <p className="leading-6 text-muted-foreground">
              {analysis.summary}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Strengths</h3>
            <ResultList
              items={analysis.strengths}
              emptyMessage="No specific strengths were identified."
              tone="strength"
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Missing Skills</h3>
            <ResultList
              items={analysis.missing_skills}
              emptyMessage="No missing skills were identified."
              tone="missing"
            />
          </div>

          <div className="space-y-3 lg:col-span-2">
            <h3 className="font-semibold">Recommendations</h3>
            <ResultList
              items={analysis.recommendations}
              emptyMessage="No recommendations were provided."
              tone="recommendation"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export { RESULT_TONES, ResultList, formatAnalysisDate }
export default AIAnalysisResult
