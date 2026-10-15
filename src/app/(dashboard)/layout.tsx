import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#fcfcfd] text-neutral-900 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
