import { useState } from "react"
import { Badge } from "../Badge"
import { Button } from "../Button"
import {
  Analytics,
  ApiKeys,
  BookOpen,
  ChevronRightSm,
  Code,
  CreditCard,
  FileDocument,
  Folder,
  Globe,
  Help,
  Home,
  Members,
  SettingsCog,
  Storage,
  Terminal,
} from "../Icon"
import {
  Sidebar,
  SidebarCard,
  SidebarCardContent,
  SidebarCardFooter,
  SidebarCardTitle,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonIcon,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SidebarMobile,
  SidebarMobileHeader,
  SidebarMobileFooter,
  SidebarMobileMenuButton,
} from "./Sidebar"

export default {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "padded",
  },
}

// =============================================
// Standard Navigation Data
// =============================================

const mainNavItems = [
  { icon: Home, label: "Overview", active: true },
  { icon: Folder, label: "Projects", badge: "New" },
  { icon: FileDocument, label: "Assets" },
  { icon: Analytics, label: "Analytics" },
]

const systemNavItems = [
  { icon: Members, label: "Team" },
  { icon: SettingsCog, label: "Settings" },
]

// =============================================
// Shared Content Components
// =============================================

const SidebarStandardGroups = () => (
  <>
    <SidebarGroup>
      <SidebarGroupLabel>Project</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                <SidebarMenuButtonIcon>
                  <item.icon />
                </SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                {item.badge && (
                  <SidebarMenuBadge>
                    <Badge size="sm" color="success">
                      {item.badge}
                    </Badge>
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>

    <SidebarGroup>
      <SidebarGroupLabel>System</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {systemNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton tooltip={item.label}>
                <SidebarMenuButtonIcon>
                  <item.icon />
                </SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </>
)

const SidebarStandardFooter = () => (
  <SidebarFooter>
    <SidebarTrigger />
  </SidebarFooter>
)

// =============================================
// Stories
// =============================================

export const Base = () => {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <SidebarProvider>
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                        {item.badge && (
                          <SidebarMenuBadge>
                            <Badge size="sm" color="success">
                              {item.badge}
                            </Badge>
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarStandardFooter />
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
            <p className="text-secondary">
              This is the main content area. The sidebar can be collapsed using the trigger button or
              by pressing <kbd className="kbd">Cmd+B</kbd> / <kbd className="kbd">Ctrl+B</kbd>.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const CollapsibleIcon = () => {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <SidebarProvider collapsible="icon" defaultOpen={false}>
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarStandardFooter />
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
            <p className="text-secondary">
              This sidebar is collapsed to show only icons. Hover over icons to see tooltips. Click
              the expand button or press <kbd className="kbd">Cmd+B</kbd> to expand.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const DualTier = () => {
  const [activeSection, setActiveSection] = useState("projects")

  const sections = [
    { id: "projects", icon: Folder, label: "Projects" },
    { id: "deployments", icon: Globe, label: "Deployments" },
    { id: "analytics", icon: Analytics, label: "Analytics" },
    { id: "resources", icon: Storage, label: "Resources" },
    { id: "settings", icon: SettingsCog, label: "Settings" },
  ]

  const subItems: Record<string, { label: string; active?: boolean }[]> = {
    projects: [
      { label: "All Projects", active: true },
      { label: "Templates" },
      { label: "Archive" },
      { label: "Shared with me" },
    ],
    deployments: [{ label: "Production" }, { label: "Staging" }, { label: "Preview" }],
    analytics: [{ label: "Realtime" }, { label: "Events" }, { label: "Audience" }],
    resources: [{ label: "Databases" }, { label: "Object Storage" }],
    settings: [{ label: "General" }, { label: "API Keys" }, { label: "Billing" }],
  }

  return (
    <SidebarProvider collapsible="icon">
      <SidebarLayout style={{ height: 600 }}>
        {/* Rail (icon-only tier) */}
        <Sidebar variant="dual-tier">
          <SidebarContent>
            <SidebarMenu>
              {sections.map((section) => (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton
                    isActive={activeSection === section.id}
                    tooltip={section.label}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <SidebarMenuButtonIcon>
                      <section.icon />
                    </SidebarMenuButtonIcon>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Secondary panel */}
        <Sidebar
          variant="inset"
          style={{ width: "220px", borderRight: "1px solid var(--color-border)" }}
        >
          <SidebarHeader>
            <span className="text-sm font-semibold px-3 py-2">
              {sections.find((s) => s.id === activeSection)?.label}
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {subItems[activeSection]?.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={item.active}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Dual-Tier Sidebar</h1>
            <p className="text-secondary">
              This layout combines a rail (icon-only) with a secondary panel for sub-navigation.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const FooterCards = () => (
  <SidebarProvider>
    <SidebarLayout style={{ height: 600 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarStandardGroups />
        </SidebarContent>

        <SidebarFooter>
          <SidebarCard dismissible onDismiss={() => { }}>
            <SidebarCardTitle>Upgrade to Pro</SidebarCardTitle>
            <SidebarCardContent>
              Unlock higher rate limits, priority support, and more.
            </SidebarCardContent>
            <SidebarCardFooter>
              <Button size="sm" color="primary" className="w-full">
                Upgrade Now
              </Button>
            </SidebarCardFooter>
          </SidebarCard>
          <SidebarTrigger />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Footer Cards</h1>
          <p className="text-secondary">
            The sidebar footer can contain promotional cards or CTAs. Cards are hidden when the
            sidebar is collapsed.
          </p>
        </div>
      </SidebarInset>
    </SidebarLayout>
  </SidebarProvider>
)

export const TextOnlySettings = () => {
  const settingsCategories = [
    {
      label: "Account",
      items: ["Profile", "Preferences", "Notifications", "Security"],
    },
    {
      label: "Organization",
      items: ["General", "Members", "Teams", "Billing"],
    },
    {
      label: "API",
      items: ["API Keys", "Webhooks", "Rate Limits"],
    },
  ]

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant="docs" style={{ width: "240px" }}>
          <SidebarContent>
            {settingsCategories.map((category) => (
              <SidebarGroup key={category.label}>
                <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {category.items.map((item, idx) => (
                      <SidebarMenuItem key={item}>
                        <SidebarMenuButton isActive={category.label === "Account" && idx === 0}>
                          <SidebarMenuButtonLabel>{item}</SidebarMenuButtonLabel>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Text-Only Settings</h1>
            <p className="text-secondary">
              This is a documentation-style sidebar without icons. It uses{" "}
              <code>collapsible=&quot;none&quot;</code> so no collapse button is rendered.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const LoadingSkeleton = () => (
  <SidebarProvider>
    <SidebarLayout style={{ height: 600 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Loading...</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarStandardFooter />
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Loading Skeleton</h1>
          <p className="text-secondary">
            Use skeleton placeholders while navigation data is loading.
          </p>
        </div>
      </SidebarInset>
    </SidebarLayout>
  </SidebarProvider>
)

export const Controlled = () => {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <div className="p-4 border-b flex items-center gap-4">
        <Button color="secondary" onClick={() => setOpen(!open)}>
          Toggle Sidebar ({open ? "Open" : "Closed"})
        </Button>
        <span className="text-secondary text-sm">Controlled state from outside the provider</span>
      </div>

      <SidebarProvider open={open} onOpenChange={setOpen}>
        <SidebarLayout style={{ height: 600 }}>
          <Sidebar>
            <SidebarContent>
              <SidebarStandardGroups />
            </SidebarContent>
            <SidebarStandardFooter />
          </Sidebar>

          <SidebarInset>
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-4">Controlled Mode</h1>
              <p className="text-secondary">
                The sidebar state is controlled externally via props. Use <code>open</code> and{" "}
                <code>onOpenChange</code> for full control.
              </p>
            </div>
          </SidebarInset>
        </SidebarLayout>
      </SidebarProvider>
    </div>
  )
}

export const WithSearch = () => (
  <SidebarProvider>
    <SidebarLayout style={{ height: 600 }}>
      <Sidebar>
        <SidebarHeader>
          <SidebarInput placeholder="Search..." shortcut="⌘K" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarStandardGroups />
        </SidebarContent>
        <SidebarStandardFooter />
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">With Search</h1>
          <p className="text-secondary">
            The sidebar can include a search input with keyboard shortcut display.
          </p>
        </div>
      </SidebarInset>
    </SidebarLayout>
  </SidebarProvider>
)

export const DocsVariant = () => {
  const [expandedItems, setExpandedItems] = useState<string[]>(["getting-started", "components"])

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const docsSections = [
    {
      id: "getting-started",
      label: "Getting Started",
      items: ["Introduction", "Installation", "Quick Start"],
    },
    {
      id: "components",
      label: "Components",
      items: ["Button", "Input", "Modal", "Sidebar"],
    },
    {
      id: "api",
      label: "API Reference",
      items: ["Hooks", "Utilities", "Types"],
    },
  ]

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant="docs" style={{ width: "280px" }}>
          <SidebarHeader>
            <div className="flex items-center gap-2 font-semibold px-3 py-2">
              <BookOpen className="size-5" />
              <span className="text-sm font-semibold">Documentation</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {docsSections.map((section) => (
              <SidebarGroup key={section.id}>
                <SidebarMenuItem expanded={expandedItems.includes(section.id)}>
                  <SidebarMenuButton onClick={() => toggleItem(section.id)}>
                    <SidebarMenuButtonLabel>{section.label}</SidebarMenuButtonLabel>
                    <ChevronRightSm
                      className="ml-auto transition-transform"
                      style={{
                        transform: expandedItems.includes(section.id)
                          ? "rotate(90deg)"
                          : "rotate(0)",
                      }}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {expandedItems.includes(section.id) && (
                  <SidebarMenuSub>
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item}>
                        <SidebarMenuSubButton isActive={item === "Sidebar"}>
                          {item}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Documentation Variant</h1>
            <p className="text-secondary">
              A documentation-style sidebar with collapsible sections and a distinct visual style.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const Mobile = () => (
  <SidebarProvider collapsible="offcanvas">
    <div style={{ height: 400, border: "1px solid var(--sidebar-border)", overflow: "hidden" }}>
      <header className="flex items-center gap-2 p-2 border-b bg-surface">
        <SidebarMobileMenuButton />
        <span className="font-semibold text-sm">Mobile View</span>
      </header>

      <SidebarMobile>
        <SidebarMobileHeader>
          <span className="font-semibold">SaaS Platform</span>
          <SidebarMobileMenuButton />
        </SidebarMobileHeader>
        <SidebarContent>
          <SidebarStandardGroups />
        </SidebarContent>
        <SidebarMobileFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <SidebarMenuButtonIcon><Help /></SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>Support</SidebarMenuButtonLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarMobileFooter>
      </SidebarMobile>
    </div>
  </SidebarProvider>
)

export const MobileMenuButtonAnimation = () => (
  <SidebarProvider>
    <div className="flex items-center justify-center p-12 bg-surface border rounded-xl">
      <div className="flex flex-col items-center gap-4">
        <SidebarMobileMenuButton />
        <span className="text-secondary text-sm">Click to toggle animation</span>
      </div>
    </div>
  </SidebarProvider>
)

const resourcesNavItems = [
  { icon: Code, label: "Logs" },
  { icon: Terminal, label: "Console" },
  { icon: Storage, label: "Storage" },
  { icon: Globe, label: "Deployments" },
  { icon: CreditCard, label: "Billing" },
  { icon: ApiKeys, label: "API Keys" },
]

export const Scrollable = () => {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <SidebarProvider>
      <SidebarLayout style={{ height: 500 }}>
        <Sidebar side="left" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {resourcesNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarStandardFooter />
        </Sidebar>
        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{activeItem}</h1>
            <p className="text-secondary mt-2">
              When the sidebar content exceeds the container height, it becomes scrollable.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

// =============================================
// No Icons (Settings Style)
// =============================================

const settingsNavItems = [
  { label: "Your profile" },
]

const organizationNavItems = [
  { label: "General", active: true },
  { label: "API keys" },
  { label: "Admin keys" },
]

const peopleNavItems = [
  { label: "People" },
  { label: "Projects" },
  { label: "Billing" },
  { label: "Limits" },
  { label: "Tunnels" },
  { label: "Usage" },
]

export const NoIcons = () => {
  const allItems = [...settingsNavItems, ...organizationNavItems, ...peopleNavItems]
  const [activeItem, setActiveItem] = useState("General")

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar style={{ width: "180px" }}>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {organizationNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>People</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {peopleNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        tooltip={item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{activeItem}</h1>
            <p className="text-secondary mt-2">
              A text-only sidebar for settings pages. Uses collapsible="none" since there are no icons to collapse to.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}
