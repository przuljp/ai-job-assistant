import { Clock3, Eye, History, LoaderCircle } from 'lucide-react'
import { formatAnalysisDate } from './AIAnalysisResult.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { cn } from '@/lib/utils.js'

function getResumeTitle(resumes, resumeId) {
  return (
    resumes.find((resume) => resume.id === resumeId)?.title ||
    `Resume #${resumeId}`
  )
}

function AnalysisHistory({
  analyses,
  loading,
  error,
  resumes,
  viewingId,
  selectedId,
  onView,
}) {
  return (
    <section aria-labelledby="analysis-history-heading">
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <History className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>
                <h2 id="analysis-history-heading">Analysis History</h2>
              </CardTitle>
              <CardDescription>
                Revisit prior results without running a new analysis.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <Alert variant="destructive" className="m-4 w-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center px-5 py-8 text-sm text-muted-foreground">
              <LoaderCircle
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
              <p>Loading analysis history...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Clock3
                className="mx-auto mb-3 size-7 text-muted-foreground/60"
                aria-hidden="true"
              />
              <p className="font-medium">
                No previous analyses for this application.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                New results will be saved here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {analyses.map((analysis) => (
                <article
                  key={analysis.id}
                  className={cn(
                    'flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between',
                    selectedId === analysis.id && 'bg-primary/[0.035]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-primary">
                      {analysis.match_score}%
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">
                          {analysis.match_score}% match
                        </h3>
                        {selectedId === analysis.id && (
                          <Badge variant="secondary">Selected</Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {getResumeTitle(resumes, analysis.resume_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatAnalysisDate(analysis.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={viewingId === analysis.id}
                    onClick={() => onView(analysis.id)}
                  >
                    {viewingId === analysis.id ? (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye data-icon="inline-start" aria-hidden="true" />
                    )}
                    {viewingId === analysis.id ? 'Loading...' : 'View'}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export { getResumeTitle }
export default AnalysisHistory
