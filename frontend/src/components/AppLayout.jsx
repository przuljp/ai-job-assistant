import { Outlet } from 'react-router-dom'
import AppNav from './AppNav.jsx'

function AppLayout() {
  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <AppNav />
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout
