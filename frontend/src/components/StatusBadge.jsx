import { Badge } from '@/components/ui/badge.jsx'
import { cn } from '@/lib/utils.js'

const STATUS_STYLES = {
  Saved: 'border-slate-200 bg-slate-100 text-slate-700',
  Applied: 'border-blue-200 bg-blue-50 text-blue-700',
  Interview: 'border-amber-200 bg-amber-50 text-amber-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Accepted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function StatusBadge({ status, className }) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_STYLES[status], className)}
    >
      {status}
    </Badge>
  )
}

export { STATUS_STYLES }
export default StatusBadge
