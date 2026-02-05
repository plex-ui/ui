import { useState, useEffect } from "react"
import styles from "./Sidebar.module.css"
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
  SidebarMenuChevron,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMobileMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
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

const resourcesNavItems = [
  { icon: Code, label: "Logs" },
  { icon: Terminal, label: "Console" },
  { icon: Storage, label: "Storage" },
  { icon: Globe, label: "Deployments" },
  { icon: CreditCard, label: "Billing" },
  { icon: ApiKeys, label: "API Keys" },
]

// =============================================
// Shared Content Components
// =============================================

const SidebarStandardGroups = () => (
  <>
    <SidebarGroup>
      <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
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
      <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
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
              This is the main content area. The sidebar can be collapsed using the trigger button
              or by pressing <kbd className="kbd">Cmd+B</kbd> / <kbd className="kbd">Ctrl+B</kbd>.
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
              <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
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

export const CollapsibleNested = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [activeItem, setActiveItem] = useState({ id: "introduction", label: "Introduction" })

  // Documentation-style navigation structure
  type NavItem = {
    id: string
    label: string
    items?: NavItem[]
  }

  const sections: NavItem[] = [
    {
      id: "getting-started",
      label: "Getting Started",
      items: [
        { id: "introduction", label: "Introduction" },
        { id: "installation", label: "Installation" },
        { id: "quick-start", label: "Quick Start" },
      ],
    },
    {
      id: "api-reference",
      label: "API Reference",
      items: [
        {
          id: "responses",
          label: "Responses",
          items: [
            { id: "create-response", label: "Create" },
            {
              id: "streaming",
              label: "Streaming",
              items: [
                { id: "stream-created", label: "response.created" },
                { id: "stream-progress", label: "response.in_progress" },
                { id: "stream-completed", label: "response.completed" },
                {
                  id: "output-item",
                  label: "response.output_item",
                  items: [
                    { id: "output-added", label: "added" },
                    { id: "output-done", label: "done" },
                  ],
                },
              ],
            },
            { id: "get-response", label: "Get" },
            { id: "list-responses", label: "List" },
            { id: "delete-response", label: "Delete" },
          ],
        },
        {
          id: "chat-completions",
          label: "Chat Completions",
          items: [
            { id: "chat-create", label: "Create" },
            { id: "chat-stream", label: "Streaming" },
          ],
        },
        { id: "models", label: "Models" },
        { id: "errors", label: "Errors" },
      ],
    },
  ]

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Recursive render function for nested items
  const renderItems = (items: NavItem[], depth: number = 0) => {
    return items.map((item) => {
      const hasChildren = item.items && item.items.length > 0
      const isExpanded = expandedSections.includes(item.id)

      if (hasChildren) {
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              indent={depth as 0 | 1 | 2 | 3}
              onClick={() => toggleSection(item.id)}
            >
              {item.label}
              <SidebarMenuChevron />
            </SidebarMenuSubButton>
            <SidebarMenuSub open={isExpanded}>{renderItems(item.items!, depth + 1)}</SidebarMenuSub>
          </SidebarMenuItem>
        )
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            indent={depth as 0 | 1 | 2 | 3}
            isActive={activeItem.id === item.id}
            onClick={() => setActiveItem({ id: item.id, label: item.label })}
          >
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      )
    })
  }

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant="docs" style={{ width: "280px" }}>
          <SidebarContent>
            {sections.map((section) => (
              <SidebarGroup key={section.id}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>{section.items && renderItems(section.items, 0)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">{activeItem.label}</h1>
            <p className="text-secondary">
              Documentation page for {activeItem.label}. This is where the content would be
              displayed.
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
                <SidebarGroupLabel size="sm">{category.label}</SidebarGroupLabel>
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
            <SidebarGroupLabel size="sm">Loading...</SidebarGroupLabel>
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

// Mobile story with Storybook controls
const MobileStoryContent = ({ mobile, nested }: { mobile: boolean; nested: boolean }) => {
  const [activeItem, setActiveItem] = useState({ id: "overview", label: "Overview" })
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Reset activeItem when nested mode changes
  useEffect(() => {
    if (nested) {
      setActiveItem({ id: "introduction", label: "Introduction" })
    } else {
      setActiveItem({ id: "overview", label: "Overview" })
    }
  }, [nested])

  // Documentation-style navigation structure (like CollapsibleNested)
  type NavItem = {
    id: string
    label: string
    items?: NavItem[]
  }

  const sections: NavItem[] = [
    {
      id: "getting-started",
      label: "Getting Started",
      items: [
        { id: "introduction", label: "Introduction" },
        { id: "installation", label: "Installation" },
        { id: "quick-start", label: "Quick Start" },
      ],
    },
    {
      id: "api-reference",
      label: "API Reference",
      items: [
        {
          id: "responses",
          label: "Responses",
          items: [
            { id: "create-response", label: "Create" },
            {
              id: "streaming",
              label: "Streaming",
              items: [
                { id: "stream-created", label: "response.created" },
                { id: "stream-progress", label: "response.in_progress" },
                { id: "stream-completed", label: "response.completed" },
              ],
            },
            { id: "get-response", label: "Get" },
            { id: "list-responses", label: "List" },
          ],
        },
        {
          id: "chat-completions",
          label: "Chat Completions",
          items: [
            { id: "chat-create", label: "Create" },
            { id: "chat-stream", label: "Streaming" },
          ],
        },
        { id: "models", label: "Models" },
        { id: "errors", label: "Errors" },
      ],
    },
  ]

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Recursive render function for nested items (like CollapsibleNested)
  // Optional onSelect callback for closing mobile menu
  const renderNestedItems = (
    items: NavItem[],
    depth: number = 0,
    onSelect?: (item: { id: string; label: string }) => void
  ) => {
    return items.map((item) => {
      const hasChildren = item.items && item.items.length > 0
      const isExpanded = expandedSections.includes(item.id)

      if (hasChildren) {
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              indent={depth as 0 | 1 | 2 | 3}
              onClick={() => toggleSection(item.id)}
            >
              {item.label}
              <SidebarMenuChevron />
            </SidebarMenuSubButton>
            <SidebarMenuSub open={isExpanded}>
              {renderNestedItems(item.items!, depth + 1, onSelect)}
            </SidebarMenuSub>
          </SidebarMenuItem>
        )
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            indent={depth as 0 | 1 | 2 | 3}
            isActive={activeItem.id === item.id}
            onClick={() => {
              setActiveItem({ id: item.id, label: item.label })
              onSelect?.({ id: item.id, label: item.label })
            }}
          >
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      )
    })
  }

  // Render nested navigation for desktop (like CollapsibleNested)
  const renderDesktopNestedNav = () => (
    <Sidebar variant="docs" style={{ width: "280px" }}>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{section.items && renderNestedItems(section.items, 0)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )

  // Render simple navigation for desktop (like Scrollable - 3 groups)
  const renderDesktopSimpleNav = () => (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    tooltip={item.label}
                    onClick={() =>
                      setActiveItem({ id: item.label.toLowerCase(), label: item.label })
                    }
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
          <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    tooltip={item.label}
                    onClick={() =>
                      setActiveItem({ id: item.label.toLowerCase(), label: item.label })
                    }
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
          <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    tooltip={item.label}
                    onClick={() =>
                      setActiveItem({ id: item.label.toLowerCase(), label: item.label })
                    }
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
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  )

  // Render nested navigation for mobile sidebar drawer
  const renderMobileNestedNav = () => (
    <SidebarContent>
      {sections.map((section) => (
        <SidebarGroup key={section.id}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{section.items && renderNestedItems(section.items, 0)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )

  // Render simple navigation for mobile sidebar drawer
  const renderMobileSimpleNav = () => (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={activeItem.label === item.label}
                  onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}
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
        <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {systemNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={activeItem.label === item.label}
                  onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}
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
        <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {resourcesNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={activeItem.label === item.label}
                  onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}
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
  )

  // Desktop layout - full sidebar with SidebarLayout
  if (!mobile) {
    return (
      <SidebarProvider collapsible={nested ? "none" : "icon"}>
        <SidebarLayout style={{ height: 667 }}>
          {nested ? renderDesktopNestedNav() : renderDesktopSimpleNav()}
          <SidebarInset>
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-4">{activeItem.label}</h1>
              <p className="text-secondary">
                This is the desktop view. Toggle mobile to see the mobile sidebar.
              </p>
            </div>
          </SidebarInset>
        </SidebarLayout>
      </SidebarProvider>
    )
  }

  // Mobile layout - header with menu button and drawer
  // Inner component to access useSidebar for data-mobile-menu attribute
  const MobileContainer = () => {
    const { openMobile, setOpenMobile } = useSidebar()

    // Handle menu item click - set active and close menu
    const handleMenuItemClick = (item: { label: string }) => {
      setActiveItem({ id: item.label.toLowerCase(), label: item.label })
      setOpenMobile(false)
    }

    // Render simple nav with close behavior
    const renderMobileNav = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    onClick={() => handleMenuItemClick(item)}
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
          <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    onClick={() => handleMenuItemClick(item)}
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
          <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeItem.label === item.label}
                    onClick={() => handleMenuItemClick(item)}
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
    )

    // Render nested nav with close behavior
    const renderMobileNestedNavWithClose = () => (
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items && renderNestedItems(section.items, 0, () => setOpenMobile(false))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    )

    return (
      <div
        data-mobile-menu={openMobile ? "visible" : "hidden"}
        style={{
          width: 375,
          height: 667,
          background: "var(--gray-75)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Mobile header - button on right only */}
        <header
          className="flex items-center"
          style={{
            justifyContent: "flex-end",
            height: 54,
            padding: "0 8px",
          }}
        >
          <SidebarMobileMenuButton />
        </header>

        {/* Main content area - white background with border */}
        <div
          className="bg-surface"
          style={{
            margin: 8,
            marginTop: 0,
            border: "1px solid var(--sidebar-border)",
            borderRadius: 8,
            height: "calc(100% - 54px - 8px)",
            overflow: "auto",
          }}
        >
          {openMobile ? (
            // Menu content - replaces page content when open
            <div className={styles.MobileMenuContent}>
              {nested ? renderMobileNestedNavWithClose() : renderMobileNav()}
            </div>
          ) : (
            // Page content
            <div style={{ padding: 24 }}>
              <h1 className="text-2xl font-semibold mb-4">{activeItem.label}</h1>
              <p className="text-secondary">
                Click the menu button to open the sidebar and select a different item.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider collapsible="offcanvas">
      <MobileContainer />
    </SidebarProvider>
  )
}

export const Mobile = (args: { mobile: boolean; nested: boolean }) => (
  <div className="flex items-center justify-center w-full">
    <MobileStoryContent {...args} />
  </div>
)

Mobile.args = {
  mobile: false,
  nested: false,
}

Mobile.argTypes = {
  mobile: { control: "boolean" },
  nested: { control: "boolean" },
}

Mobile.parameters = {
  controls: { include: ["mobile", "nested"] },
}

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

export const Scrollable = () => {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <SidebarProvider>
      <SidebarLayout style={{ height: 500 }}>
        <Sidebar side="left" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
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

const settingsNavItems = [{ label: "Your profile" }]

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

export const TextOnly = () => {
  const [activeItem, setActiveItem] = useState("General")

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant="docs" style={{ width: "180px" }}>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel size="sm">Settings</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">Organization</SidebarGroupLabel>
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
              <SidebarGroupLabel size="sm">People</SidebarGroupLabel>
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
              A text-only sidebar for settings pages. Uses collapsible="none" since there are no
              icons to collapse to.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}
