import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DashboardLayoutProps {
    children: React.ReactNode
    activeSection: string
    setActiveSection: (section: string) => void
    onExport: () => void
    hasForecast: boolean
}

export function DashboardLayout({
    children,
    activeSection,
    setActiveSection,
    onExport,
    hasForecast
}: DashboardLayoutProps) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-950">
                <AppSidebar
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                />
                <main className="flex-1 w-full overflow-hidden">
                    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
                        <div className="flex items-center">
                            <SidebarTrigger className="text-slate-400 hover:text-white" />
                            <h1 className="ml-4 text-lg font-semibold text-white capitalize">
                                {activeSection}
                            </h1>
                        </div>

                        {hasForecast && (
                            <Button
                                onClick={onExport}
                                variant="outline"
                                size="sm"
                                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </header>
                    <div className="h-[calc(100vh-4rem)] p-6 overflow-auto bg-slate-950">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}
