import {
    TrendingUp,
    LineChart,
    Settings,
    Database,
    Home,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarHeader,
} from "@/components/ui/sidebar"

interface NavItem {
    title: string
    url: string
    icon: any
    isActive?: boolean
    onClick?: () => void
}

interface AppSidebarProps {
    activeSection: string
    setActiveSection: (section: string) => void
}

export function AppSidebar({ activeSection, setActiveSection }: AppSidebarProps) {
    const items: NavItem[] = [
        {
            title: "Overview",
            url: "#overview",
            icon: Home,
            onClick: () => setActiveSection("overview"),
            isActive: activeSection === "overview",
        },
        {
            title: "Data Source",
            url: "#data",
            icon: Database,
            onClick: () => setActiveSection("data"),
            isActive: activeSection === "data",
        },
        {
            title: "Model Config",
            url: "#model",
            icon: Settings,
            onClick: () => setActiveSection("model"),
            isActive: activeSection === "model",
        },
        {
            title: "Validation",
            url: "#validation",
            icon: TrendingUp,
            onClick: () => setActiveSection("validation"),
            isActive: activeSection === "validation",
        },
        {
            title: "Forecast",
            url: "#forecast",
            icon: LineChart,
            onClick: () => setActiveSection("forecast"),
            isActive: activeSection === "forecast",
        },
    ]

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-slate-800 p-4 bg-slate-950">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1 rounded bg-gradient-to-br from-purple-500 to-cyan-500">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
                        Prophetly
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent className="bg-slate-900 text-slate-300">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-slate-500">Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={item.isActive}
                                        onClick={item.onClick}
                                        className="hover:bg-slate-800 hover:text-white data-[active=true]:bg-slate-800 data-[active=true]:text-purple-400"
                                    >
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
