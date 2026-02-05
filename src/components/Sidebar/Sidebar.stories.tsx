import { useState } from "react"
import { Badge } from "../Badge"
import { Button } from "../Button"
import {
  Analytics,
  ApiKeys,
  Batches,
  BookOpen,
  ChevronRightSm,
  Code,
  CreditCard,
  FileDocument,
  Folder,
  Globe,
  Help,
  Home,
  ImageSquare,
  Members,
  Playground,
  Plus,
  Robot,
  Search,
  SettingsCog,
  Storage,
  Terminal,
  Tools,
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
  SidebarMobile,
  SidebarMobileFooter,
  SidebarMobileHeader,
  SidebarMobileMenuButton,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "./Sidebar"

export default {
  title: "Components/Sidebar",
  parameters: {
    layout: "padded",
  },
}

// Sample navigation data
const mainNavItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: Playground, label: "Playground" },
  { icon: Robot, label: "Assistants", badge: "New" },
  { icon: Terminal, label: "Chat completions" },
  { icon: ImageSquare, label: "Images" },
  { icon: Storage, label: "Storage" },
  { icon: Batches, label: "Batches" },
  { icon: Analytics, label: "Usage" },
]

const settingsNavItems = [
  { icon: ApiKeys, label: "API keys" },
  { icon: Members, label: "Members" },
  { icon: CreditCard, label: "Billing" },
  { icon: SettingsCog, label: "Settings" },
]

// =============================================
// Desktop Stories
// =============================================

export const Base = () => (
  <SidebarProvider>
    <SidebarLayout style={{ height: 500 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
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

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNavItems.map((item) => (
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
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Help">
                <SidebarMenuButtonIcon>
                  <Help />
                </SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>Help</SidebarMenuButtonLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
          <p className="text-secondary">
            This is the main content area. The sidebar can be collapsed using the trigger button or
            by pressing <kbd className="kbd">Cmd+B</kbd> / <kbd className="kbd">Ctrl+B</kbd>.
          </p>
        </div>
      </SidebarInset>
    </SidebarLayout>
  </SidebarProvider>
)

export const CollapsibleIcon = () => (
  <SidebarProvider collapsible="icon" defaultOpen={false}>
    <SidebarLayout style={{ height: 500 }}>
      <Sidebar>
        <SidebarHeader className="justify-center">
          <div className="size-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xs">
            AI
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarTrigger />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Collapsed to Icons</h1>
          <p className="text-secondary">
            This sidebar is collapsed to show only icons. Hover over icons to see tooltips. Click
            the expand button or press <kbd className="kbd">Cmd+B</kbd> to expand.
          </p>
        </div>
      </SidebarInset>
    </SidebarLayout>
  </SidebarProvider>
)

export const DualTier = () => {
  const [activeSection, setActiveSection] = useState("playground")

  const sections = [
    { id: "playground", icon: Playground, label: "Playground" },
    { id: "assistants", icon: Robot, label: "Assistants" },
    { id: "storage", icon: Storage, label: "Storage" },
    { id: "batches", icon: Batches, label: "Batches" },
    { id: "settings", icon: SettingsCog, label: "Settings" },
  ]

  const subItems: Record<string, { label: string; active?: boolean }[]> = {
    playground: [
      { label: "Chat", active: true },
      { label: "Complete" },
      { label: "Edit" },
      { label: "Embeddings" },
    ],
    assistants: [{ label: "All Assistants" }, { label: "Create New" }, { label: "Templates" }],
    storage: [{ label: "Files" }, { label: "Vector Stores" }],
    batches: [{ label: "All Batches" }, { label: "Create Batch" }],
    settings: [{ label: "General" }, { label: "API Keys" }, { label: "Billing" }],
  }

  return (
    <SidebarProvider collapsible="icon">
      <SidebarLayout style={{ height: 500 }}>
        {/* Rail (icon-only tier) */}
        <Sidebar variant="dual-tier">
          <SidebarHeader className="justify-center">
            <div className="size-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xs">
              AI
            </div>
          </SidebarHeader>

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
            <span className="font-semibold">
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
    <SidebarLayout style={{ height: 500 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            {mainNavItems.slice(0, 5).map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton isActive={item.active}>
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarCard dismissible onDismiss={() => {}}>
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
      <SidebarLayout style={{ height: 500 }}>
        <Sidebar variant="docs" style={{ width: "240px" }}>
          <SidebarHeader>
            <span className="font-semibold">Settings</span>
          </SidebarHeader>

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
    <SidebarLayout style={{ height: 500 }}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 font-semibold">
            <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </SidebarHeader>

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
        <SidebarLayout style={{ height: 443 }}>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                      <SidebarMenuButtonIcon>
                        <item.icon />
                      </SidebarMenuButtonIcon>
                      <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
              <SidebarTrigger />
            </SidebarFooter>
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
    <SidebarLayout style={{ height: 500 }}>
      <Sidebar>
        <SidebarHeader>
          <SidebarInput placeholder="Search..." shortcut="⌘K" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton isActive={item.active}>
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarTrigger />
        </SidebarFooter>
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
      <SidebarLayout style={{ height: 500 }}>
        <Sidebar variant="docs" style={{ width: "280px" }}>
          <SidebarHeader>
            <div className="flex items-center gap-2 font-semibold">
              <BookOpen className="size-5" />
              <span>Documentation</span>
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
              A collapsible nested navigation pattern for documentation sites. Uses{" "}
              <code>collapsible=&quot;none&quot;</code> since docs sidebars typically don&apos;t
              collapse.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

// =============================================
// Mobile Stories
// =============================================

export const Mobile = () => (
  <SidebarProvider collapsible="offcanvas">
    <div style={{ height: 500 }}>
      {/* Mobile header */}
      <header className="flex items-center justify-between p-4 border-b">
        <span className="font-semibold">Menu</span>
        <SidebarMobileMenuButton />
      </header>

      {/* Mobile drawer */}
      <SidebarMobile>
        <SidebarMobileHeader>
          <span className="font-semibold">Menu</span>
          <SidebarMobileMenuButton />
        </SidebarMobileHeader>

        <SidebarContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton isActive={item.active} size="lg">
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarSeparator />

          <SidebarMenu>
            {settingsNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton size="lg">
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </SidebarMobile>

      {/* Main content */}
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Mobile Sidebar</h1>
        <p className="text-secondary">
          Click the hamburger menu to open the mobile drawer. The icon animates to an X when open.
        </p>
      </main>
    </div>
  </SidebarProvider>
)

Mobile.parameters = {
  viewport: {
    defaultViewport: "mobile1",
  },
}

export const MobileMenuButtonAnimation = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h2 className="text-lg font-semibold">Mobile Menu Button Animation</h2>

      <SidebarProvider>
        <div className="flex items-center gap-4">
          <div className="text-sm text-secondary">Closed:</div>
          <button
            type="button"
            className="relative block w-8 h-8 p-0 border-0 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer"
          >
            <span className="relative top-0 left-[7px] block w-[18px] h-[18px] overflow-hidden">
              <span className="absolute top-1 left-0 block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform" />
              <span className="block translate-x-[-6px] transition-transform">
                <span className="absolute top-3 left-0 block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform" />
              </span>
            </span>
          </button>

          <div className="text-sm text-secondary">Open (X):</div>
          <button
            type="button"
            className="relative block w-8 h-8 p-0 border-0 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer"
            data-expanded=""
          >
            <span className="relative top-0 left-[7px] block w-[18px] h-[18px] overflow-hidden">
              <span
                className="absolute top-1 left-0 block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform"
                style={{ transform: "translateY(4px)" }}
              >
                <span
                  className="block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100"
                  style={{ transform: "rotate(45deg)" }}
                />
              </span>
              <span className="block transition-transform" style={{ transform: "translateX(0)" }}>
                <span
                  className="absolute top-3 left-0 block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform"
                  style={{ transform: "translateY(-4px)" }}
                >
                  <span
                    className="block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100"
                    style={{ transform: "rotate(-45deg)" }}
                  />
                </span>
              </span>
            </span>
          </button>
        </div>
      </SidebarProvider>

      <div className="mt-8">
        <h3 className="text-sm font-medium mb-4">Interactive Demo:</h3>
        <SidebarProvider>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative block w-12 h-12 p-0 border rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="relative top-0 left-[15px] block w-[18px] h-[18px] overflow-hidden">
              <span
                className="absolute top-1 left-0 block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-all duration-200"
                style={{
                  transform: isOpen ? "translateY(4px)" : "translateY(0)",
                }}
              >
                <span
                  className="block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform duration-200"
                  style={{
                    transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                    transitionDelay: isOpen ? "0.2s" : "0s",
                  }}
                />
              </span>
              <span
                className="block transition-transform duration-200"
                style={{
                  transform: isOpen ? "translateX(0)" : "translateX(-6px)",
                  transitionDelay: isOpen ? "0s" : "0.2s",
                }}
              >
                <span
                  className="absolute top-3 left-0 block w-[18px] h-0.5 transition-all duration-200"
                  style={{
                    transform: isOpen ? "translateY(-4px)" : "translateY(0)",
                  }}
                >
                  <span
                    className="block w-[18px] h-0.5 bg-gray-900 dark:bg-gray-100 transition-transform duration-200"
                    style={{
                      transform: isOpen ? "rotate(-45deg)" : "rotate(0)",
                      transitionDelay: isOpen ? "0.2s" : "0s",
                    }}
                  />
                </span>
              </span>
            </span>
          </button>
          <p className="mt-4 text-sm text-secondary">
            Click to toggle: {isOpen ? "Open (X)" : "Closed (☰)"}
          </p>
        </SidebarProvider>
      </div>
    </div>
  )
}

export const MobileWithGroups = () => (
  <SidebarProvider collapsible="offcanvas">
    <div style={{ height: 500 }}>
      <header className="flex items-center justify-between p-4 border-b">
        <span className="font-semibold">Menu</span>
        <SidebarMobileMenuButton />
      </header>

      <SidebarMobile>
        <SidebarMobileHeader>
          <span className="font-semibold">Menu</span>
          <SidebarMobileMenuButton />
        </SidebarMobileHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive size="lg">
                    <SidebarMenuButtonIcon>
                      <Home />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>Dashboard</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <SidebarMenuButtonIcon>
                      <Playground />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>Playground</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <SidebarMenuButtonIcon>
                      <Folder />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>Default project</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <SidebarMenuButtonIcon>
                      <Plus />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>New project</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <SidebarMenuButtonIcon>
                      <FileDocument />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>Documentation</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <SidebarMenuButtonIcon>
                      <Code />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>API Reference</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </SidebarMobile>

      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Mobile with Groups</h1>
        <p className="text-secondary">Mobile sidebar with grouped navigation sections.</p>
      </main>
    </div>
  </SidebarProvider>
)

MobileWithGroups.parameters = {
  viewport: {
    defaultViewport: "mobile1",
  },
}

export const MobileTablet = () => (
  <SidebarProvider collapsible="offcanvas">
    <div style={{ height: 500 }}>
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <SidebarMobileMenuButton />
          <span className="font-semibold">Menu</span>
        </div>
        <div className="flex items-center gap-2">
          <Button color="secondary" variant="ghost" size="sm" uniform>
            <Search />
          </Button>
          <Button color="secondary" variant="ghost" size="sm" uniform>
            <Globe />
          </Button>
          <Button color="secondary" variant="ghost" size="sm" uniform>
            <Tools />
          </Button>
        </div>
      </header>

      <SidebarMobile>
        <SidebarMobileHeader>
          <span className="font-semibold">Navigation</span>
          <SidebarMobileMenuButton />
        </SidebarMobileHeader>

        <SidebarContent>
          <SidebarInput placeholder="Search..." />

          <SidebarMenu className="mt-4">
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton isActive={item.active} size="lg">
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

          <SidebarSeparator />

          <SidebarMenu>
            {settingsNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton size="lg">
                  <SidebarMenuButtonIcon>
                    <item.icon />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarMobileFooter>
          <Button color="secondary" variant="outline" className="w-full">
            <Help className="mr-2" />
            Help & Support
          </Button>
        </SidebarMobileFooter>
      </SidebarMobile>

      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Tablet View</h1>
        <p className="text-secondary">
          This demonstrates the sidebar behavior at tablet breakpoints. The sidebar slides in from
          the right as an overlay.
        </p>
      </main>
    </div>
  </SidebarProvider>
)

MobileTablet.parameters = {
  viewport: {
    defaultViewport: "tablet",
  },
}

// =============================================
// Interactive Responsive Demo
// =============================================

export const ResponsiveDemo = () => {
  const [containerWidth, setContainerWidth] = useState(800)
  const [isDragging, setIsDragging] = useState(false)
  const isMobile = containerWidth < 768

  const handleMouseDown = () => setIsDragging(true)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const newWidth = Math.max(320, Math.min(1200, e.clientX - rect.left))
    setContainerWidth(newWidth)
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Responsive Sidebar Demo</h2>
          <p className="text-sm text-secondary">
            Drag the right edge to resize. Width: {containerWidth}px{" "}
            {isMobile ? "(Mobile)" : "(Desktop)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setContainerWidth(400)}
          >
            Mobile
          </Button>
          <Button
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setContainerWidth(768)}
          >
            Tablet
          </Button>
          <Button
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setContainerWidth(1024)}
          >
            Desktop
          </Button>
        </div>
      </div>

      <div
        className="relative select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            width: containerWidth,
            height: 500,
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <SidebarProvider collapsible={isMobile ? "offcanvas" : "icon"}>
            {/* Desktop sidebar - hidden on mobile */}
            {!isMobile && (
              <SidebarLayout style={{ height: "100%" }}>
                <Sidebar>
                  <SidebarContent>
                    <SidebarMenu>
                      {mainNavItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                            <SidebarMenuButtonIcon>
                              <item.icon />
                            </SidebarMenuButtonIcon>
                            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                            {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>

                    <SidebarSeparator />

                    <SidebarMenu>
                      {settingsNavItems.map((item) => (
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
                  </SidebarContent>

                  <SidebarFooter>
                    <SidebarTrigger color="secondary" />
                  </SidebarFooter>
                </Sidebar>

                <SidebarInset>
                  <div className="p-4">
                    <h1 className="text-xl font-semibold mb-2">Desktop View</h1>
                    <p className="text-sm text-secondary">
                      The sidebar is shown on the left. Use the collapse button to toggle icon mode.
                    </p>
                  </div>
                </SidebarInset>
              </SidebarLayout>
            )}

            {/* Mobile view */}
            {isMobile && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <header className="flex items-center justify-between p-4 border-b shrink-0">
                  <span className="font-semibold">Menu</span>
                  <SidebarMobileMenuButton />
                </header>

                <SidebarMobile contained>
                  <SidebarMobileHeader>
                    <span className="font-semibold">Menu</span>
                    <SidebarMobileMenuButton />
                  </SidebarMobileHeader>

                  <SidebarContent>
                    <SidebarMenu>
                      {mainNavItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton isActive={item.active} size="lg">
                            <SidebarMenuButtonIcon>
                              <item.icon />
                            </SidebarMenuButtonIcon>
                            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                            {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>

                    <SidebarSeparator />

                    <SidebarMenu>
                      {settingsNavItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton size="lg">
                            <SidebarMenuButtonIcon>
                              <item.icon />
                            </SidebarMenuButtonIcon>
                            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarContent>
                </SidebarMobile>

                <main className="p-4 flex-1 overflow-auto">
                  <h1 className="text-xl font-semibold mb-2">Mobile View</h1>
                  <p className="text-sm text-secondary">
                    Click the hamburger menu to open the drawer. It slides in from the right with
                    animations.
                  </p>
                </main>
              </div>
            )}
          </SidebarProvider>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            top: 0,
            left: containerWidth - 4,
            width: 8,
            height: 500,
            cursor: "ew-resize",
            background: isDragging ? "var(--color-accent)" : "transparent",
            borderRadius: "var(--radius-sm)",
            transition: isDragging ? "none" : "background 0.15s ease",
          }}
          className="hover:bg-gray-200 dark:hover:bg-gray-700"
        />
      </div>
    </div>
  )
}

ResponsiveDemo.parameters = {
  layout: "padded",
}
