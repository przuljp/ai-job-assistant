import { NavLink, useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import useAuth from '../auth/useAuth.js'
import { Button } from '@/components/ui/button.jsx'
import { cn } from '@/lib/utils.js'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: BriefcaseBusiness },
  { to: '/resumes', label: 'Resumes', icon: FileText },
]

function AppNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="border-b bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:py-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold">AI Job Assistant</p>
          <p className="text-xs text-muted-foreground">Career workspace</p>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-3"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isActive &&
                  'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm',
              )
            }
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="ml-auto shrink-0 justify-start text-muted-foreground md:mt-auto md:ml-0 md:w-full"
          onClick={handleLogout}
        >
          <LogOut data-icon="inline-start" aria-hidden="true" />
          Logout
        </Button>
      </nav>
    </aside>
  )
}

export { NAV_ITEMS }
export default AppNav
