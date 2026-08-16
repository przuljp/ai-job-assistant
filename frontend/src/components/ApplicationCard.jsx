import {
  CalendarDays,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card.jsx'

function ApplicationCard({ application, deleting, onEdit, onDelete }) {
  return (
    <article className="min-w-0">
      <Card className="h-full gap-4 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                {application.position}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {application.company}
              </p>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 text-sm">
          {application.application_date && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              Application date: {application.application_date}
            </p>
          )}

          {application.job_description && (
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <FileText className="size-4" aria-hidden="true" />
                Job description
              </p>
              <p className="line-clamp-3 text-muted-foreground">
                {application.job_description}
              </p>
            </div>
          )}

          {application.notes && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Notes:</span>{' '}
              {application.notes}
            </p>
          )}

          {application.job_url && (
            <a
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
              href={application.job_url}
              target="_blank"
              rel="noreferrer"
            >
              View job posting
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(application)}
          >
            <Pencil data-icon="inline-start" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={() => onDelete(application)}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </CardFooter>
      </Card>
    </article>
  )
}

export default ApplicationCard
