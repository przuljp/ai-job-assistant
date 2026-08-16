import { Card, CardContent, CardHeader } from '@/components/ui/card.jsx'

function StatCard({ label, value, icon: Icon }) {
  return (
    <article className="min-w-0">
      <Card className="h-full gap-3 bg-card/90 py-4 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {label}
          </h2>
          {Icon && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </article>
  )
}

export default StatCard
