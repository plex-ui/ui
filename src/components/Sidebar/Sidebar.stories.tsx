import { useEffect, useState } from "react"
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
  SidebarCardTitleLink,
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
import styles from "./Sidebar.module.css"

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

const CollapsibleIconContent = ({ open }: { open: boolean }) => {
  const [activeItem, setActiveItem] = useState("Overview")

  return (
    <SidebarProvider collapsible="icon" defaultOpen={open}>
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
              This sidebar uses <code>collapsible="icon"</code> mode. Toggle the <code>open</code>{" "}
              control below, or press <kbd className="kbd">Cmd+B</kbd> to expand/collapse.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const CollapsibleIcon = (args: { open: boolean }) => (
  <CollapsibleIconContent key={args.open ? "open" : "closed"} {...args} />
)

CollapsibleIcon.args = {
  open: true,
}

CollapsibleIcon.argTypes = {
  open: { control: "boolean" },
}

CollapsibleIcon.parameters = {
  controls: { include: ["open"] },
}

// CollapsibleNested with icons control
const CollapsibleNestedContent = ({ icons }: { icons: boolean }) => {
  // Initialize state based on icons prop (component remounts when icons changes due to key)
  const [expandedSections, setExpandedSections] = useState<string[]>(
    icons ? ["dashboard"] : ["getting-started"],
  )
  const [activeItem, setActiveItem] = useState(
    icons ? { id: "overview", label: "Overview" } : { id: "introduction", label: "Introduction" },
  )

  // Documentation-style navigation structure with optional icon
  type NavItem = {
    id: string
    label: string
    icon?: React.ComponentType
    items?: NavItem[]
  }

  // Original sections without icons (deep nesting)
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

  // Sections with icons (2 levels only)
  const sectionsWithIcons: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      items: [
        { id: "overview", label: "Overview" },
        { id: "analytics", label: "Analytics" },
        { id: "reports", label: "Reports" },
      ],
    },
    {
      id: "content",
      label: "Content",
      icon: FileDocument,
      items: [
        { id: "pages", label: "Pages" },
        { id: "posts", label: "Posts" },
        { id: "media", label: "Media Library" },
      ],
    },
    {
      id: "users",
      label: "Users",
      icon: Members,
      items: [
        { id: "all-users", label: "All Users" },
        { id: "roles", label: "Roles" },
        { id: "permissions", label: "Permissions" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      icon: SettingsCog,
      items: [
        { id: "general", label: "General" },
        { id: "security", label: "Security" },
        { id: "integrations", label: "Integrations" },
      ],
    },
  ]

  const currentSections = icons ? sectionsWithIcons : sections

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
      const Icon = item.icon

      if (hasChildren) {
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              indent={depth as 0 | 1 | 2 | 3}
              onClick={() => toggleSection(item.id)}
            >
              {Icon && <Icon />}
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
            {Icon && <Icon />}
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      )
    })
  }

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant={icons ? undefined : "docs"} style={{ width: "280px" }}>
          <SidebarContent>
            {icons ? (
              // Icons variant: use standard SidebarMenuButton with icons
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sectionsWithIcons.map((item) => {
                      const isExpanded = expandedSections.includes(item.id)
                      const Icon = item.icon
                      return (
                        <SidebarMenuItem key={item.id} expanded={isExpanded}>
                          <SidebarMenuButton onClick={() => toggleSection(item.id)}>
                            <SidebarMenuButtonIcon>{Icon && <Icon />}</SidebarMenuButtonIcon>
                            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                            <SidebarMenuChevron />
                          </SidebarMenuButton>
                          <SidebarMenuSub open={isExpanded} hasIcons>
                            {item.items?.map((child) => (
                              <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                  indent={1}
                                  isActive={activeItem.id === child.id}
                                  onClick={() =>
                                    setActiveItem({ id: child.id, label: child.label })
                                  }
                                >
                                  {child.label}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              // Default variant: render sections as groups with labels
              currentSections.map((section) => (
                <SidebarGroup key={section.id}>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>{section.items && renderItems(section.items, 0)}</SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))
            )}
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

export const CollapsibleNested = (args: { icons: boolean }) => (
  <CollapsibleNestedContent key={args.icons ? "icons" : "no-icons"} {...args} />
)

CollapsibleNested.args = {
  icons: false,
}

CollapsibleNested.argTypes = {
  icons: { control: "boolean" },
}

CollapsibleNested.parameters = {
  controls: { include: ["icons"] },
}

export const FooterCards = () => (
  <SidebarProvider collapsible="icon">
    <SidebarLayout style={{ height: 600 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarStandardGroups />
        </SidebarContent>

        <SidebarFooter>
          <SidebarCard dismissible onDismiss={() => {}}>
            <SidebarCardTitleLink href="#">Upgrade to Pro</SidebarCardTitleLink>
            <SidebarCardContent>
              Unlock higher rate limits, priority support, and advanced features.
            </SidebarCardContent>
            <SidebarCardFooter>
              <Button size="sm" pill color="primary">
                View Plans
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
    <SidebarLayout style={{ height: 300 }}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton labelWidth="70%" />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton labelWidth="55%" />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton labelWidth="80%" />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton labelWidth="45%" />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Loading</h1>
          <p className="text-secondary">Skeleton placeholders while navigation loads.</p>
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

export const WithSearch = () => {
  const [activeItem, setActiveItem] = useState("Overview")
  const [searchValue, setSearchValue] = useState("")

  const docsSections = [
    {
      label: "Get started",
      items: [
        "Overview",
        "Quickstart",
        "Models",
        "Pricing",
        "Libraries",
        "Docs MCP",
        "Latest: GPT-5.2",
      ],
    },
    {
      label: "Core concepts",
      items: [
        "Text generation",
        "Code generation",
        "Images and vision",
        "Audio and speech",
        "Structured output",
        "Function calling",
        "Responses API",
      ],
    },
    {
      label: "Agents",
      items: ["Overview", "Build agents"],
    },
  ]

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 600 }}>
        <Sidebar variant="docs" style={{ width: "220px" }}>
          <SidebarHeader>
            <SidebarInput
              placeholder="Search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue("")}
            />
          </SidebarHeader>

          <SidebarContent>
            {docsSections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item}>
                        <SidebarMenuSubButton
                          indent={0}
                          isActive={activeItem === item}
                          onClick={() => setActiveItem(item)}
                        >
                          {item}
                        </SidebarMenuSubButton>
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
            <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
            <p className="text-secondary">
              The sidebar includes a search input that stays fixed at the top while content scrolls.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

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
    onSelect?: (item: { id: string; label: string }) => void,
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
  // Wrap in fixed-width container to prevent preview width changes during collapse
  if (!mobile) {
    return (
      <div style={{ width: nested ? 680 : 640 }}>
        <SidebarProvider collapsible="icon">
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
      </div>
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
        <Sidebar side="left">
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

// =============================================
// Header Sizes
// =============================================

const HeaderSizesContent = ({ size }: { size: "sm" | "lg" }) => {
  const [activeItem, setActiveItem] = useState(size === "sm" ? "Overview" : "Introduction")

  // Dashboard-style items for sm size
  const dashboardSections = [
    {
      label: "Project",
      items: [
        { icon: Home, label: "Overview" },
        { icon: Folder, label: "Projects" },
        { icon: Analytics, label: "Analytics" },
      ],
    },
    {
      label: "System",
      items: [
        { icon: Members, label: "Team" },
        { icon: SettingsCog, label: "Settings" },
      ],
    },
  ]

  // Documentation-style sections for lg size
  const docsSections = [
    {
      label: "Getting Started",
      items: ["Introduction", "Installation", "Quick Start"],
    },
    {
      label: "Components",
      items: ["Button", "Input", "Modal", "Sidebar"],
    },
  ]

  if (size === "sm") {
    return (
      <SidebarProvider collapsible="none">
        <SidebarLayout style={{ height: 400 }}>
          <Sidebar style={{ width: "200px" }}>
            <SidebarContent>
              {dashboardSections.map((section) => (
                <SidebarGroup key={section.label}>
                  <SidebarGroupLabel size="sm">{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            isActive={activeItem === item.label}
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
              ))}
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
              <p className="text-secondary">
                Compact headers with tertiary color for dashboard navigation.
              </p>
            </div>
          </SidebarInset>
        </SidebarLayout>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 400 }}>
        <Sidebar variant="docs" style={{ width: "220px" }}>
          <SidebarContent>
            {docsSections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel size="lg">{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item}>
                        <SidebarMenuButton
                          isActive={activeItem === item}
                          onClick={() => setActiveItem(item)}
                        >
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
            <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
            <p className="text-secondary">
              Prominent headers with primary color for documentation sections.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

export const HeaderSizes = (args: { size: "sm" | "lg" }) => (
  <HeaderSizesContent key={args.size} {...args} />
)

HeaderSizes.args = {
  size: "sm",
}

HeaderSizes.argTypes = {
  size: { control: "select", options: ["sm", "lg"] },
}

HeaderSizes.parameters = {
  controls: { include: ["size"] },
}

// =============================================
// With Badges
// =============================================

export const WithBadges = (args: { pill: boolean }) => {
  const [activeItem, setActiveItem] = useState("Overview")

  const menuItems = [
    { label: "Overview", icon: Home },
    { label: "API Reference", icon: Code, badge: { text: "New", color: "success" as const } },
    { label: "Playground", icon: Terminal, badge: { text: "Beta", color: "warning" as const } },
    { label: "Fine-tuning", icon: SettingsCog, badge: { text: "3", color: "info" as const } },
    { label: "Batch API", icon: Storage, badge: { text: "Updated", color: "discovery" as const } },
    { label: "Legacy Models", icon: FileDocument, badge: { text: "Deprecated", color: "danger" as const } },
    { label: "Usage", icon: Analytics, badge: { text: "12", color: "caution" as const } },
    { label: "Billing", icon: CreditCard },
  ]

  return (
    <SidebarProvider collapsible="none">
      <SidebarLayout style={{ height: 400 }}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={activeItem === item.label}
                        onClick={() => setActiveItem(item.label)}
                      >
                        <SidebarMenuButtonIcon>
                          <item.icon />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                        {item.badge && (
                          <SidebarMenuBadge>
                            <Badge size="sm" color={item.badge.color} pill={args.pill}>
                              {item.badge.text}
                            </Badge>
                          </SidebarMenuBadge>
                        )}
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
            <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
            <p className="text-secondary">
              Badges indicate status, counts, or special states for menu items.
            </p>
          </div>
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  )
}

WithBadges.args = {
  pill: false,
}

WithBadges.parameters = {
  controls: { include: ["pill"] },
}
