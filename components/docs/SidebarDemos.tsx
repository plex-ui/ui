'use client';

import React, { createContext, useCallback, useContext, useId, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from '@plexui/ui/components/Avatar';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Popover } from '@plexui/ui/components/Popover';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import {
   Abc,
   AllProductsExplore,
   Analytics,
   Bolt,
   Book,
   Branch,
   BuildingWorkspace,
   ButtonMousePointer,
   Calendar,
   CameraPhoto,
   Chat,
   CheckCheck,
   CheckCircle,
   CheckMd,
   CheckboxChecked,
   ChevronDownMd,
   ChevronRightMd,
   ChevronUpDown,
   Clip,
   Code,

   Commit,
   CreditCard,
   Cube,
   Desktop,
   DotsHorizontal,
   FileDocument,
   Filter,
   FilterBadge,
   Folder,
   Globe,
   GripVertical,
   GroupCheck,
   GroupCheckCircle,
   Help,
   Home,
   ImageSquare,
   InfoCircle,
   LinkExternal,
   ListChevronsDownUp,
   Logout,
   MapPin,
   Members,
   Number123,
   PanelBottom,
   PastedText,
   Phone,
   Plus,

   SettingsCog,
   SidebarCollapseLeft,
   SidebarCollapseRight,
   SettingsWrench,
   SpacingVertical,
   SquareAsterisk,
   SquareDashed,
   Storage,
   Terminal,
   TextAlignStart,

   TextInitial,
   TextSelect,
   Tools,
 } from '@plexui/ui/components/Icon';
import { Menu } from '@plexui/ui/components/Menu';
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
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuChevron,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMobileMenuButton,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@plexui/ui/components/Sidebar';

// =============================================
// Shared data
// =============================================

const mainNavItems = [
  { icon: Home, label: 'Overview' },
  { icon: Folder, label: 'Projects', badge: 'New' },
  { icon: FileDocument, label: 'Assets' },
  { icon: Analytics, label: 'Analytics' },
];

const systemNavItems = [
  { icon: Members, label: 'Team' },
  { icon: SettingsCog, label: 'Settings' },
];

const resourcesNavItems = [
  { icon: Code, label: 'Logs' },
  { icon: Terminal, label: 'Console' },
];

// =============================================
// Shared demo header with wordmark + tooltip-wrapped trigger
// =============================================

function DemoSidebarHeader({ title = 'App' }: { title?: string } = {}) {
  const { state, collapsible } = useSidebar();
  const isCollapsed = state === 'collapsed';
  // SidebarTrigger toggles on its own click; the Tooltip only adds the hint
  const trigger = (
    <Tooltip
      compact
      content={
        <span className="inline-flex items-center gap-1.5">
          {isCollapsed ? 'Expand' : 'Collapse'}
          <kbd className="console-trigger-kbd">⌘B</kbd>
        </span>
      }
    >
      <SidebarTrigger>
        {isCollapsed ? <SidebarCollapseRight /> : <SidebarCollapseLeft />}
      </SidebarTrigger>
    </Tooltip>
  );
  return (
    <SidebarHeader>
      <span className="demo-sidebar-wordmark">{title}</span>
      {collapsible !== 'none' && trigger}
    </SidebarHeader>
  );
}

// =============================================
// Base
// =============================================

export function SidebarBaseDemo() {
   const [activeItem, setActiveItem] = useState('Overview');
   const [bordered, setBordered] = useState(true);
   const [collapsible, setCollapsible] = useState<'none' | 'icon' | 'offcanvas'>('icon');
   const [icons, setIcons] = useState(true);
   const [badges, setBadges] = useState(true);
   const [labelSize, setLabelSize] = useState<'sm' | 'lg'>('sm');
   const [footerCard, setFooterCard] = useState(false);

   const renderGroup = (label: string, items: typeof mainNavItems) => (
     <SidebarGroup>
       <SidebarGroupLabel size={labelSize}>{label}</SidebarGroupLabel>
       <SidebarGroupContent>
         <SidebarMenu>
           {items.map((item) => (
             <SidebarMenuItem key={item.label}>
               <SidebarMenuButton
                 isActive={activeItem === item.label}
                 tooltip={item.label}
                 onClick={() => setActiveItem(item.label)}
               >
                 {icons && (
                   <SidebarMenuButtonIcon>
                     <item.icon />
                   </SidebarMenuButtonIcon>
                 )}
                 <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                 {badges && item.badge && (
                   <SidebarMenuBadge>
                     <Badge size="sm" color="info">{item.badge}</Badge>
                   </SidebarMenuBadge>
                 )}
               </SidebarMenuButton>
             </SidebarMenuItem>
           ))}
         </SidebarMenu>
       </SidebarGroupContent>
     </SidebarGroup>
   );

   return (
     <>
     <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <style>{`
         [data-demo-stage] [class*="SidebarLayout"] { --sidebar-width: 260px; }
         [data-demo-stage] aside[class*="Sidebar-module"] { --sidebar-icon-size: 16px; padding-top: 12px; }
         [data-demo-stage] aside[class*="Sidebar-module"] > [class*="Header"] { min-height: 0; }
         [data-demo-stage] aside[class*="Sidebar-module"] > [class*="Content"] { padding-top: 12px; -webkit-mask-image: none; mask-image: none; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 18px; padding-bottom: 0; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:first-child:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 0; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="GroupLabel"] { margin-top: 0; padding-bottom: 6px; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"]:has(.demo-sidebar-wordmark) { padding-left: 12px; padding-right: 0; gap: 4px; transition: padding var(--sidebar-collapse-duration) var(--cubic-move); }
         [data-demo-stage][data-bordered="false"] [class*="SidebarLayout"] { background: var(--color-surface); }
         [data-demo-stage][data-bordered="false"] aside[class*="Sidebar-module"] { background: var(--color-surface-secondary); }
         [data-demo-stage][data-bordered="false"] [class*="Inset"] { margin: 0; box-shadow: none; border-radius: 0; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] { width: auto; margin-left: auto; flex: 0 0 auto; }
         [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] span { opacity: 1 !important; pointer-events: auto !important; }
         [data-demo-stage] aside[class*="Sidebar-module"] button[class*="Trigger"] [class*="TriggerIcon"] { margin: 0 3px; }
         [data-demo-stage] [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] { padding-left: 0; padding-right: 0; justify-content: center; gap: 0; }
         [data-demo-stage] [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] button[class*="Trigger"] { margin-left: 0; margin-right: 0; }
         [data-demo-stage] .demo-sidebar-wordmark {
           flex: 1;
           min-width: 0;
           max-width: 1000px;
           font-size: 15px;
           font-weight: 600;
           letter-spacing: -0.005em;
           white-space: nowrap;
           overflow: hidden;
           opacity: 1;
           transition: opacity var(--sidebar-collapse-duration) var(--cubic-move), max-width var(--sidebar-collapse-duration) var(--cubic-move);
         }
         [data-demo-stage] [data-sidebar="collapsed"] .demo-sidebar-wordmark { opacity: 0; max-width: 0; pointer-events: none; }
       `}</style>
       <SidebarProvider className="h-full" collapsible={icons ? collapsible : 'none'} key={`${collapsible}-${icons}`}>
        <SidebarLayout className="h-full">
            <Sidebar>
              <DemoSidebarHeader />
              <SidebarContent>
                {renderGroup('Project', mainNavItems)}
                {renderGroup('System', systemNavItems)}
                {renderGroup('Resources', resourcesNavItems)}
              </SidebarContent>
              {footerCard && (
                <SidebarFooter>
                  <SidebarCard dismissible onDismiss={() => {}}>
                    <SidebarCardTitleLink href="#" onClick={(e) => e.preventDefault()}>
                      Upgrade to Pro
                    </SidebarCardTitleLink>
                    <SidebarCardContent>
                      Unlock higher rate limits, priority support, and advanced features.
                    </SidebarCardContent>
                    <SidebarCardFooter>
                      <Button size="sm" pill color="primary">View Plans</Button>
                    </SidebarCardFooter>
                  </SidebarCard>
                </SidebarFooter>
              )}
            </Sidebar>

            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
                <p className="text-secondary">Main content area.</p>
              </div>
            </SidebarInset>
          </SidebarLayout>
        </SidebarProvider>
    </div>
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="collapsible">
        <SegmentedControl<'none' | 'icon' | 'offcanvas'>
          value={collapsible}
          onChange={setCollapsible}
          aria-label="Collapsible mode"
          size="xs"
        >
          <SegmentedControl.Option value="none">none</SegmentedControl.Option>
          <SegmentedControl.Option value="icon">icon</SegmentedControl.Option>
          <SegmentedControl.Option value="offcanvas">offcanvas</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
      <DemoControlRow name="labelSize">
        <SegmentedControl<'sm' | 'lg'>
          value={labelSize}
          onChange={setLabelSize}
          aria-label="Group label size"
          size="xs"
        >
          <SegmentedControl.Option value="sm">sm</SegmentedControl.Option>
          <SegmentedControl.Option value="lg">lg</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
      <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
      <DemoControlBoolean name="badges" value={badges} onChange={setBadges} />
      <DemoControlBoolean name="footerCard" value={footerCard} onChange={setFooterCard} />
      <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />
    </div>
    </>
  );
}

// =============================================
// Collapsible icon (with open control)
// =============================================

const CollapsibleIconContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

function SidebarCollapsibleIconDemoRoot({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <CollapsibleIconContext.Provider value={{ open, setOpen }}>
      {children}
    </CollapsibleIconContext.Provider>
  );
}

function SidebarCollapsibleIconDemoPreview() {
   const ctx = useContext(CollapsibleIconContext);
   const [activeItem, setActiveItem] = useState('Overview');
   const open = ctx?.open ?? true;

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible="icon" open={open} onOpenChange={ctx?.setOpen}>
        <SidebarLayout className="h-full">
            <Sidebar>
              <DemoSidebarHeader />
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
            </Sidebar>

            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
                <p className="text-secondary">
                  Uses <code>collapsible=&quot;icon&quot;</code>. Tooltips appear when collapsed.
                </p>
              </div>
            </SidebarInset>
          </SidebarLayout>
        </SidebarProvider>
    </div>
  );
}

function SidebarCollapsibleIconDemoControls() {
  const ctx = useContext(CollapsibleIconContext);
  if (!ctx) return null;
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="open" value={ctx.open} onChange={ctx.setOpen} />
    </div>
  );
}

export function SidebarCollapsibleIconDemo() {
  return (
    <SidebarCollapsibleIconDemoRoot>
      <SidebarCollapsibleIconDemoPreview />
      <SidebarCollapsibleIconDemoControls />
    </SidebarCollapsibleIconDemoRoot>
  );
}

// =============================================
// Nested navigation
// =============================================

type NavItem = {
  id: string;
  label: string;
  icon?: React.ComponentType;
  items?: NavItem[];
};

const nestedDocsSections: NavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'installation', label: 'Installation' },
      { id: 'quick-start', label: 'Quick Start' },
      { id: 'configuration', label: 'Configuration' },
      { id: 'examples', label: 'Examples' },
    ],
  },
  {
    id: 'api-reference',
    label: 'API Reference',
    items: [
      {
        id: 'responses',
        label: 'Responses',
        items: [
          { id: 'create-response', label: 'Create' },
          {
            id: 'streaming',
            label: 'Streaming',
            items: [
              { id: 'stream-created', label: 'response.created' },
              { id: 'stream-progress', label: 'response.in_progress' },
              { id: 'stream-completed', label: 'response.completed' },
              {
                id: 'output-item',
                label: 'response.output_item',
                items: [
                  { id: 'output-added', label: 'added' },
                  { id: 'output-done', label: 'done' },
                ],
              },
            ],
          },
          { id: 'get-response', label: 'Get' },
          { id: 'list-responses', label: 'List' },
          { id: 'delete-response', label: 'Delete' },
        ],
      },
      {
        id: 'chat-completions',
        label: 'Chat Completions',
        items: [
          { id: 'chat-create', label: 'Create' },
          { id: 'chat-stream', label: 'Streaming' },
        ],
      },
      {
        id: 'embeddings',
        label: 'Embeddings',
        items: [
          { id: 'embeddings-create', label: 'Create' },
          { id: 'embeddings-list', label: 'List' },
        ],
      },
      { id: 'models', label: 'Models' },
      { id: 'files', label: 'Files' },
      { id: 'images', label: 'Images' },
      { id: 'audio', label: 'Audio' },
      { id: 'errors', label: 'Errors' },
    ],
  },
  {
    id: 'guides',
    label: 'Guides',
    items: [
      { id: 'best-practices', label: 'Best Practices' },
      { id: 'rate-limits', label: 'Rate Limits' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'error-handling', label: 'Error Handling' },
      { id: 'pagination', label: 'Pagination' },
    ],
  },
  {
    id: 'sdks',
    label: 'SDKs & Libraries',
    items: [
      { id: 'sdk-python', label: 'Python' },
      { id: 'sdk-node', label: 'Node.js' },
      { id: 'sdk-go', label: 'Go' },
      { id: 'sdk-java', label: 'Java' },
    ],
  },
];

const nestedIconsSections: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'reports', label: 'Reports' },
      { id: 'metrics', label: 'Metrics' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileDocument,
    items: [
      { id: 'pages', label: 'Pages' },
      { id: 'posts', label: 'Posts' },
      { id: 'media', label: 'Media Library' },
      { id: 'templates', label: 'Templates' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    icon: Members,
    items: [
      { id: 'all-users', label: 'All Users' },
      { id: 'roles', label: 'Roles' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'invitations', label: 'Invitations' },
    ],
  },
  {
    id: 'api',
    label: 'API',
    icon: Code,
    items: [
      { id: 'api-keys', label: 'API Keys' },
      { id: 'webhooks', label: 'Webhooks' },
      { id: 'logs', label: 'Logs' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'subscription', label: 'Subscription' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'usage', label: 'Usage' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsCog,
    items: [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
];

export function SidebarNestedDemo() {
  const [icons, setIcons] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [activeItem, setActiveItem] = useState({ id: 'introduction', label: 'Introduction' });

  React.useEffect(() => {
    setExpandedSections(icons ? ['dashboard'] : ['getting-started']);
    setActiveItem(icons ? { id: 'overview', label: 'Overview' } : { id: 'introduction', label: 'Introduction' });
  }, [icons]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const currentSections = icons ? nestedIconsSections : nestedDocsSections;

  const renderItems = (items: NavItem[], depth: number = 0) => {
    return items.map((item) => {
      const hasChildren = item.items && item.items.length > 0;
      const isExpanded = expandedSections.includes(item.id);
      const Icon = item.icon;

      if (hasChildren) {
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              indent={depth as 0 | 1 | 2 | 3}
              onClick={() => toggleSection(item.id)}
            >
              {Icon != null && <Icon />}
              {item.label}
              <SidebarMenuChevron />
            </SidebarMenuSubButton>
            <SidebarMenuSub open={isExpanded}>{renderItems(item.items!, depth + 1)}</SidebarMenuSub>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            indent={depth as 0 | 1 | 2 | 3}
            isActive={activeItem.id === item.id}
            onClick={() => setActiveItem({ id: item.id, label: item.label })}
          >
            {Icon != null && <Icon />}
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    });
  };

   return (
     <>
       <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
         <SidebarProvider className="h-full" collapsible="none" key={icons ? 'icons' : 'no-icons'}>
          <SidebarLayout className="h-full">
              <Sidebar variant={icons ? undefined : 'docs'}>
                <SidebarContent>
                  {icons ? (
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {nestedIconsSections.map((section) => {
                            const isExpanded = expandedSections.includes(section.id);
                            const Icon = section.icon;
                            return (
                              <SidebarMenuItem key={section.id} expanded={isExpanded}>
                                <SidebarMenuButton onClick={() => toggleSection(section.id)}>
                                  <SidebarMenuButtonIcon>{Icon != null && <Icon />}</SidebarMenuButtonIcon>
                                  <SidebarMenuButtonLabel>{section.label}</SidebarMenuButtonLabel>
                                  <SidebarMenuChevron />
                                </SidebarMenuButton>
                                <SidebarMenuSub open={isExpanded} hasIcons>
                                  {section.items?.map((child) => (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton
                                        indent={1}
                                        isActive={activeItem.id === child.id}
                                        onClick={() => setActiveItem({ id: child.id, label: child.label })}
                                      >
                                        {child.label}
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  ) : (
                    currentSections.map((section) => (
                      <SidebarGroup key={section.id}>
                        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>{section.items != null && renderItems(section.items, 0)}</SidebarMenu>
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
                    Documentation page for {activeItem.label}. This is where the content would be displayed.
                  </p>
                </div>
               </SidebarInset>
            </SidebarLayout>
          </SidebarProvider>
      </div>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
      </div>
    </>
  );
}

// =============================================
// Filtered tree navigation
// =============================================

type StepType = 'screen' | 'action' | 'document' | 'selfie';

type WorkflowStep = {
  id: string;
  label: string;
  type: StepType;
  children?: WorkflowStep[];
};

const stepTypeConfig: Record<StepType, { icon: React.ComponentType; label: string }> = {
  screen: { icon: Desktop, label: 'Screen' },
  action: { icon: Bolt, label: 'Action' },
  document: { icon: FileDocument, label: 'Document' },
  selfie: { icon: CameraPhoto, label: 'Selfie' },
};

const stepFilterOptions = (Object.keys(stepTypeConfig) as StepType[]).map((type) => ({
  value: type,
  label: stepTypeConfig[type].label,
}));



const workflowSteps: WorkflowStep[] = [
  { id: 'start', label: 'Start', type: 'screen' },
  { id: 'country-select', label: 'Country select', type: 'screen' },
  {
    id: 'gov-id',
    label: 'ID verification',
    type: 'document',
    children: [
      { id: 'run-gov-id', label: 'Run ID verification', type: 'action' },
      { id: 'update-gov-fields', label: 'Update inquiry fields', type: 'action' },
    ],
  },
  {
    id: 'selfie-check',
    label: 'Selfie verification',
    type: 'selfie',
    children: [
      { id: 'capture-selfie', label: 'Capture selfie', type: 'action' },
      { id: 'run-selfie', label: 'Run selfie check', type: 'action' },
    ],
  },
  {
    id: 'doc-check',
    label: 'Document check',
    type: 'document',
    children: [
      { id: 'run-doc', label: 'Run document check', type: 'action' },
      { id: 'update-doc-fields', label: 'Update inquiry fields', type: 'action' },
    ],
  },
  { id: 'success', label: 'Success', type: 'screen' },
  {
    id: 'fail',
    label: 'Fail',
    type: 'screen',
    children: [
      { id: 'retry-doc', label: 'Retry document', type: 'action' },
      { id: 'retry-selfie', label: 'Retry selfie', type: 'action' },
    ],
  },
  { id: 'doc-retry', label: 'Document retry', type: 'screen' },
  { id: 'selfie-retry', label: 'Selfie retry', type: 'screen' },
];

function filterWorkflowTree(
  items: WorkflowStep[],
  search: string,
): WorkflowStep[] {
  if (!search) return items;

  return items.reduce<WorkflowStep[]>((acc, item) => {
    const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase());
    const filteredChildren = item.children
      ? filterWorkflowTree(item.children, search)
      : undefined;
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

    if (matchesSearch || hasMatchingChildren) {
      acc.push(hasMatchingChildren ? { ...item, children: filteredChildren } : item);
    }

    return acc;
  }, []);
}

function flattenByType(
  items: WorkflowStep[],
  typeFilters: Set<StepType>,
  search: string,
): WorkflowStep[] {
  const result: WorkflowStep[] = [];

  function collect(list: WorkflowStep[]) {
    for (const item of list) {
      const matchesType = typeFilters.has(item.type);
      const matchesSearch = !search || item.label.toLowerCase().includes(search.toLowerCase());
      if (matchesType && matchesSearch) result.push(item);
      if (item.children) collect(item.children);
    }
  }

  collect(items);
  return result;
}

export function SidebarFilteredTreeDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(['gov-id', 'selfie-check', 'doc-check', 'fail']),
  );
  const [activeItem, setActiveItem] = useState('start');
  const [bordered, setBordered] = useState(true);
  const iconSize = 'sm' as const;
  const [expandMode, setExpandMode] = useState<'row' | 'chevron'>('chevron');

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isFiltering = typeFilters.length > 0;
  const typeFilterSet = new Set(typeFilters as StepType[]);

  const displaySteps = isFiltering
    ? flattenByType(workflowSteps, typeFilterSet, searchQuery)
    : filterWorkflowTree(workflowSteps, searchQuery);

  const iconPx = iconSize === 'sm' ? 16 : 20;
  const iconSizeVar = { '--sidebar-icon-size': `${iconPx}px` } as React.CSSProperties;
  const nestedIconStyle: React.CSSProperties = { width: iconPx, height: iconPx, flexShrink: 0 };

  const renderTreeItems = (items: WorkflowStep[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const TypeIcon = stepTypeConfig[item.type].icon;

      if (depth === 0) {
        if (hasChildren) {
          const chevronOnly = expandMode === 'chevron';
          return (
            <SidebarMenuItem key={item.id} expanded={isExpanded}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => {
                  if (chevronOnly) setActiveItem(item.id);
                  else toggleExpanded(item.id);
                }}
              >
                <SidebarMenuButtonIcon style={iconSizeVar}><TypeIcon /></SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                {chevronOnly ? (
                  <span
                    role="none"
                    className={`${ghostBtnCls} ml-auto transition-transform`}
                    style={{ width: 26, height: 26, marginRight: -9, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleExpanded(item.id); } }}
                  >
                    <ChevronDownMd />
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center justify-center shrink-0 ml-auto transition-transform [&>svg]:block [&>svg]:w-4 [&>svg]:h-4"
                    style={{ width: 26, height: 26, marginRight: -9, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  >
                    <ChevronDownMd />
                  </span>
                )}
              </SidebarMenuButton>
              <SidebarMenuSub open={isExpanded} hasIcons>
                {renderTreeItems(item.children!, depth + 1)}
              </SidebarMenuSub>
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={activeItem === item.id}
              onClick={() => setActiveItem(item.id)}
            >
              <SidebarMenuButtonIcon style={iconSizeVar}><TypeIcon /></SidebarMenuButtonIcon>
              <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }

      if (hasChildren) {
        const chevronOnly = expandMode === 'chevron';
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              className="gap-2"
              indent={Math.min(depth, 3) as 0 | 1 | 2 | 3}
              isActive={chevronOnly ? activeItem === item.id : undefined}
              onClick={() => {
                if (chevronOnly) setActiveItem(item.id);
                else toggleExpanded(item.id);
              }}
            >
               <span style={nestedIconStyle} className="inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"><TypeIcon /></span>
               {item.label}
               {chevronOnly ? (
                 <span
                   role="none"
                   className={`${ghostBtnCls} ml-auto transition-transform`}
                   style={{ width: 26, height: 26, marginRight: -9, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                   onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleExpanded(item.id); } }}
                 >
                   <ChevronDownMd />
                 </span>
               ) : (
                 <span
                   className="inline-flex items-center justify-center shrink-0 ml-auto transition-transform [&>svg]:block [&>svg]:w-4 [&>svg]:h-4"
                   style={{ width: 26, height: 26, marginRight: -9, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                 >
                   <ChevronDownMd />
                 </span>
               )}
            </SidebarMenuSubButton>
            <SidebarMenuSub open={isExpanded}>
              {renderTreeItems(item.children!, depth + 1)}
            </SidebarMenuSub>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            className="gap-2"
            indent={Math.min(depth, 3) as 0 | 1 | 2 | 3}
            isActive={activeItem === item.id}
            onClick={() => setActiveItem(item.id)}
          >
            <span style={nestedIconStyle} className="inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"><TypeIcon /></span>
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    });
  };

  const renderFlatItems = (items: WorkflowStep[]): React.ReactNode => {
    return items.map((item) => {
      const TypeIcon = stepTypeConfig[item.type].icon;
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            isActive={activeItem === item.id}
            onClick={() => setActiveItem(item.id)}
          >
            <SidebarMenuButtonIcon style={iconSizeVar}><TypeIcon /></SidebarMenuButtonIcon>
            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  const findLabel = (items: WorkflowStep[]): string => {
    for (const item of items) {
      if (item.id === activeItem) return item.label;
      if (item.children) {
        const found = findLabel(item.children);
        if (found) return found;
      }
    }
    return '';
  };
  const activeItemLabel = findLabel(workflowSteps) || 'Start';

   return (
     <>
       <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
         <SidebarProvider className="h-full" collapsible="none">
           <SidebarLayout className="h-full">
               <Sidebar>
                 <SidebarHeader>
                   <div className="flex items-center gap-2 w-full [&>div:first-child>div]:!p-0" style={{ padding: '16px 0 8px' }}>
                    <div className="flex-1">
                      <SidebarInput
                        size="md"
                        pill={false}
                        variant="soft"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClear={() => setSearchQuery('')}
                      />
                    </div>
                    <Menu>
                      <Menu.Trigger>
                        <Button
                          variant="soft"
                          size="md"
                          color="secondary"
                          pill={false}
                          aria-label="Filter by type"
                          uniform
                        >
                          {isFiltering ? <FilterBadge /> : <Filter />}
                        </Button>
                      </Menu.Trigger>
                      <Menu.Content minWidth="auto" align="end">
                        {stepFilterOptions.map((opt) => (
                          <Menu.CheckboxItem
                            key={opt.value}
                            checked={typeFilters.includes(opt.value)}
                            indicatorPosition="end"
                            indicatorVariant="ghost"
                            onCheckedChange={(checked) =>
                              setTypeFilters((prev) =>
                                checked
                                  ? [...prev, opt.value]
                                  : prev.filter((v) => v !== opt.value),
                              )
                            }
                            onSelect={(evt) => evt.preventDefault()}
                          >
                            {opt.label}
                          </Menu.CheckboxItem>
                        ))}
                      </Menu.Content>
                    </Menu>
                  </div>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {isFiltering ? renderFlatItems(displaySteps) : renderTreeItems(displaySteps)}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>

              <SidebarInset>
                <div className="p-6">
                  <h1 className="text-2xl font-semibold mb-4">{activeItemLabel}</h1>
                  <p className="text-secondary">
                    {isFiltering
                      ? 'Filtered results shown as a flat list.'
                      : 'Use the search and filter controls to narrow the navigation tree.'}
                  </p>
                </div>
               </SidebarInset>
            </SidebarLayout>
          </SidebarProvider>
      </div>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="expand">
          <SegmentedControl<'row' | 'chevron'>
            value={expandMode}
            onChange={setExpandMode}
            aria-label="Expand trigger"
            size="xs"
          >
            <SegmentedControl.Option value="row">row</SegmentedControl.Option>
            <SegmentedControl.Option value="chevron">chevron</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />
      </div>
    </>
  );
}

// =============================================
// Action tree navigation
// =============================================

const ghostBtnCls = 'inline-flex items-center justify-center shrink-0 rounded-sm cursor-pointer p-0 m-0 border-0 bg-transparent appearance-none leading-none align-middle select-none hover:bg-[var(--color-background-secondary-ghost-hover)] active:bg-[var(--color-background-secondary-ghost-hover)] transition-colors [&>svg]:block [&>svg]:w-4 [&>svg]:h-4 relative z-[1] pointer-events-auto';

// =============================================
// Action Tree — Types, Config, Data
// =============================================

type ActionNodeType = 'action' | 'condition' | 'module' | 'screen' | 'container' | 'footer' |
  'button' | 'image' | 'text' | 'title' | 'spacer' |
  'address-input' | 'checkbox' | 'checkbox-group' | 'country-select' | 'date' |
  'file-upload' | 'masked-text' | 'multi-select' | 'number-input' | 'phone-number' |
  'radio-group' | 'select' | 'text-area' | 'text-input' | 'url-input';

type ActionNode = {
  id: string;
  label: string;
  type: ActionNodeType;
  children?: ActionNode[];
};

const actionNodeConfig: Record<ActionNodeType, { icon: React.ComponentType; label: string }> = {
  action: { icon: Bolt, label: 'Action' },
  condition: { icon: Commit, label: 'Condition' },
  module: { icon: AllProductsExplore, label: 'Module' },
  screen: { icon: Desktop, label: 'Screen' },
  container: { icon: SquareDashed, label: 'Container' },
  footer: { icon: PanelBottom, label: 'Footer' },
  button: { icon: ButtonMousePointer, label: 'Button' },
  image: { icon: ImageSquare, label: 'Image' },
  text: { icon: TextAlignStart, label: 'Text' },
  title: { icon: TextInitial, label: 'Title' },
  spacer: { icon: SpacingVertical, label: 'Spacer' },
  'address-input': { icon: MapPin, label: 'Address input' },
  checkbox: { icon: CheckboxChecked, label: 'Checkbox' },
  'checkbox-group': { icon: GroupCheck, label: 'Checkbox group' },
  'country-select': { icon: Globe, label: 'Country select' },
  date: { icon: Calendar, label: 'Date' },
  'file-upload': { icon: Clip, label: 'File upload' },
  'masked-text': { icon: SquareAsterisk, label: 'Masked text' },
  'multi-select': { icon: CheckCheck, label: 'Multi select' },
  'number-input': { icon: Number123, label: 'Number input' },
  'phone-number': { icon: Phone, label: 'Phone number' },
  'radio-group': { icon: GroupCheckCircle, label: 'Radio group' },
  select: { icon: CheckMd, label: 'Select' },
  'text-area': { icon: TextSelect, label: 'Text area' },
  'text-input': { icon: Abc, label: 'Text input' },
  'url-input': { icon: LinkExternal, label: 'URL input' },
};

const actionFilterOptions = (['action', 'condition', 'module', 'screen', 'container', 'footer'] as ActionNodeType[]).map((t) => ({
  value: t,
  label: actionNodeConfig[t].label,
}));

const actionTreeData: ActionNode[] = [
  { id: 'action', label: 'Action', type: 'action' },
  { id: 'condition', label: 'Condition', type: 'condition' },
  {
    id: 'screen', label: 'Screen', type: 'screen',
    children: [
      {
        id: 'container-elements', label: 'Container 1', type: 'container',
        children: [
          { id: 'el-button', label: 'Button', type: 'button' },
          { id: 'el-image', label: 'Image', type: 'image' },
          { id: 'el-text', label: 'Text', type: 'text' },
          { id: 'el-title', label: 'Title', type: 'title' },
          { id: 'el-spacer', label: 'Spacer', type: 'spacer' },
        ],
      },
      {
        id: 'container-forms', label: 'Container 2', type: 'container',
        children: [
          { id: 'fm-address', label: 'Address input', type: 'address-input' },
          { id: 'fm-checkbox', label: 'Checkbox', type: 'checkbox' },
          { id: 'fm-checkgroup', label: 'Checkbox group', type: 'checkbox-group' },
          { id: 'fm-country', label: 'Country select', type: 'country-select' },
          { id: 'fm-date', label: 'Date', type: 'date' },
          { id: 'fm-file', label: 'File upload', type: 'file-upload' },
          { id: 'fm-masked', label: 'Masked text', type: 'masked-text' },
          { id: 'fm-multi', label: 'Multi select', type: 'multi-select' },
          { id: 'fm-number', label: 'Number input', type: 'number-input' },
          { id: 'fm-phone', label: 'Phone number', type: 'phone-number' },
          { id: 'fm-radio', label: 'Radio group', type: 'radio-group' },
          { id: 'fm-select', label: 'Select', type: 'select' },
          { id: 'fm-textarea', label: 'Text area', type: 'text-area' },
          { id: 'fm-textinput', label: 'Text input', type: 'text-input' },
          { id: 'fm-url', label: 'URL input', type: 'url-input' },
        ],
      },
      {
        id: 'footer', label: 'Footer', type: 'footer',
        children: [
          { id: 'ft-text', label: 'Text', type: 'text' },
          { id: 'ft-button', label: 'Button', type: 'button' },
        ],
      },
    ],
  },
  {
    id: 'module', label: 'Module', type: 'module',
    children: [
      { id: 'mod-screen-1', label: 'Screen 1', type: 'screen' },
      { id: 'mod-screen-2', label: 'Screen 2', type: 'screen' },
      { id: 'mod-screen-3', label: 'Screen 3', type: 'screen' },
    ],
  },
];

function filterActionTree(items: ActionNode[], search: string): ActionNode[] {
  if (!search) return items;
  return items.reduce<ActionNode[]>((acc, item) => {
    const match = item.label.toLowerCase().includes(search.toLowerCase());
    const filtered = item.children ? filterActionTree(item.children, search) : undefined;
    const childMatch = filtered && filtered.length > 0;
    if (match || childMatch) acc.push(childMatch ? { ...item, children: filtered } : item);
    return acc;
  }, []);
}

function flattenActionNodes(items: ActionNode[], typeFilters: Set<ActionNodeType> | null, search: string): ActionNode[] {
  const result: ActionNode[] = [];
  const hasTypeFilter = typeFilters && typeFilters.size > 0;
  (function collect(list: ActionNode[]) {
    for (const item of list) {
      const matchType = !hasTypeFilter || typeFilters!.has(item.type);
      const matchSearch = !search || item.label.toLowerCase().includes(search.toLowerCase());
      if (matchType && matchSearch) {
        result.push(item);
      }
      if (item.children) collect(item.children);
    }
  })(items);
  return result;
}

function findSiblingIds(items: ActionNode[], targetId: string): string[] | null {
  for (const item of items) {
    if (item.children) {
      if (item.children.some((c) => c.id === targetId)) return item.children.map((c) => c.id);
      const found = findSiblingIds(item.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function reorderActionTree(items: ActionNode[], activeId: string, overId: string): ActionNode[] {
  return items.map((item) => {
    if (!item.children) return item;
    const aIdx = item.children.findIndex((c) => c.id === activeId);
    const oIdx = item.children.findIndex((c) => c.id === overId);
    if (aIdx !== -1 && oIdx !== -1) {
      if (item.children[aIdx].type === 'footer' || item.children[oIdx].type === 'footer') return item;
      return { ...item, children: arrayMove(item.children, aIdx, oIdx) };
    }
    return { ...item, children: reorderActionTree(item.children, activeId, overId) };
  });
}

const elementTypes: ActionNodeType[] = ['button', 'image', 'text', 'title', 'spacer'];
const formTypes: ActionNodeType[] = [
  'address-input', 'checkbox', 'checkbox-group', 'country-select', 'date',
  'file-upload', 'masked-text', 'multi-select', 'number-input', 'phone-number',
  'radio-group', 'select', 'text-area', 'text-input', 'url-input',
];

function ATMenuIcon({ type, icon }: { type?: ActionNodeType; icon?: React.ComponentType }) {
  const Icon = icon || (type ? actionNodeConfig[type].icon : null);
  if (!Icon) return null;
  return <span className="inline-flex items-center justify-center w-4 h-4 shrink-0 [&>svg]:w-full [&>svg]:h-full"><Icon /></span>;
}

function ActionMenuItem({ type }: { type: ActionNodeType }) {
  return <Menu.Item onSelect={() => {}}><ATMenuIcon type={type} /> {actionNodeConfig[type].label}</Menu.Item>;
}

function ScreenAddMenu({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Menu>
      <Menu.Trigger>{trigger}</Menu.Trigger>
      <Menu.Content minWidth="auto" align="end">
        <Menu.Item onSelect={() => {}}><ATMenuIcon type="container" /> {actionNodeConfig.container.label}</Menu.Item>
        <Menu.Item onSelect={() => {}}><ATMenuIcon type="footer" /> {actionNodeConfig.footer.label}</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

function ContainerAddMenu({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Menu>
      <Menu.Trigger>{trigger}</Menu.Trigger>
      <Menu.Content minWidth="auto" align="end">
        {elementTypes.map((t) => <ActionMenuItem key={t} type={t} />)}
        <Menu.Separator />
        {formTypes.map((t) => <ActionMenuItem key={t} type={t} />)}
      </Menu.Content>
    </Menu>
  );
}

// =============================================
// Action Tree — Sortable Item
// =============================================

const AT_BTN = 24;
const AT_ICON: React.CSSProperties = { width: 24, height: 24, flexShrink: 0, borderRadius: 6 };
const AT_ACTIONS = 'item-actions absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover/ati:opacity-100 group-hover/ati:pointer-events-auto z-[2]';
const atItemPl = (depth: number, isGroup: boolean) => 4 + (isGroup ? depth : depth + 1) * 24;

function SortableActionItem({
  item, pl, activeItem, expanded, onSelect, onToggle, childRenderer,
}: {
  item: ActionNode;
  pl: number;
  activeItem: string;
  expanded: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  childRenderer: (parent: ActionNode) => React.ReactNode;
}) {
  const TypeIcon = actionNodeConfig[item.type].icon;
  const isGroup = !!item.children;
  const hasKids = isGroup && item.children!.length > 0;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const yOnly = transform ? { ...transform, x: 0 } : null;
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(yOnly),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.7 : undefined,
    position: 'relative',
  };

  const hoverCls = isDragging
    ? 'text-[var(--sidebar-menu-text-active)] [&::before]:!opacity-50 [&::before]:![transform:scale(1)]'
    : 'group-hover/ati:text-[var(--sidebar-menu-text-active)] group-hover/ati:[&::before]:!opacity-50 group-hover/ati:[&::before]:![transform:scale(1)]';

  const actionsCls = isDragging
    ? 'item-actions absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-100 pointer-events-auto z-[2]'
    : AT_ACTIONS;

  const labelPadCls = isDragging
    ? `flex-1 min-w-0 truncate text-left relative z-[1] ${isGroup ? 'pr-[54px]' : 'pr-[30px]'}`
    : `flex-1 min-w-0 truncate text-left relative z-[1] ${isGroup ? 'group-hover/ati:pr-[54px]' : 'group-hover/ati:pr-[30px]'}`;

  return (
    <SidebarMenuSubItem ref={setNodeRef} style={style}>
      <div className="group/ati relative">
        <SidebarMenuSubButton
          indent={1}
          isActive={activeItem === item.id}
          className={`gap-0.5 ${hoverCls}`}
          style={{ paddingLeft: pl, paddingRight: 4, paddingTop: 0, paddingBottom: 0, height: 32 }}
          onClick={() => onSelect(item.id)}
        >
          <span className="flex items-center shrink-0">
            {isGroup && (
              <span role="none" className={`${ghostBtnCls} transition-transform shrink-0`}
                style={{ width: 24, height: 24, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onToggle(item.id); } }}
              ><ChevronDownMd /></span>
            )}
            <span style={AT_ICON} className="inline-flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 relative z-[1]"><TypeIcon /></span>
          </span>
          <span className={labelPadCls}>{item.label}</span>
        </SidebarMenuSubButton>
        <span className={actionsCls}>
          {isGroup && (
            <ContainerAddMenu trigger={
              <button type="button" className={ghostBtnCls} style={{ width: AT_BTN, height: AT_BTN }}
                aria-label="Add"><Plus /></button>
            } />
          )}
          <span
            className="inline-flex items-center justify-center shrink-0 [&>svg]:block [&>svg]:w-4 [&>svg]:h-4 relative z-[1] pointer-events-auto text-[var(--color-text-tertiary)]"
            style={{ width: AT_BTN, height: AT_BTN, borderRadius: 6, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            {...listeners} {...attributes}><GripVertical /></span>
        </span>
      </div>
      {isGroup && !isDragging && (
        <SidebarMenuSub open={expanded} hasIcons>
          {hasKids && childRenderer(item)}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  );
}

// =============================================
// Action Tree — Demo
// =============================================

export function SidebarActionTreeDemo() {
  const [steps, setSteps] = useState(actionTreeData);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [headerMode, setHeaderMode] = useState<'collapse' | 'filter'>('collapse');
  const defaultExpanded = ['screen', 'container-elements', 'container-forms', 'footer', 'module'];
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(defaultExpanded),
  );
  const [activeItem, setActiveItem] = useState('screen');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [bordered, setBordered] = useState(true);
  const dragSiblingIds = useRef<Set<string> | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* Collapse mode: toggle all groups expanded / collapsed */
  const groupIds = ['screen', 'container-elements', 'container-forms', 'footer', 'module'];
  const hasAnyExpanded = groupIds.some((id) => expandedItems.has(id));
  const toggleCollapseAll = () => {
    if (hasAnyExpanded) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(defaultExpanded));
    }
  };

  /* Filter mode: flatten when searching OR type filters active */
  const isFilterMode = headerMode === 'filter';
  const hasTypeFilters = typeFilters.length > 0;
  const isFlattening = isFilterMode && (hasTypeFilters || searchQuery.length > 0);
  const typeFilterSet = new Set(typeFilters as ActionNodeType[]);

  const displaySteps = isFlattening
    ? flattenActionNodes(steps, hasTypeFilters ? typeFilterSet : null, searchQuery)
    : filterActionTree(steps, searchQuery);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const iconSizeVar = { '--sidebar-icon-size': '16px' } as React.CSSProperties;

  const findLabel = (items: ActionNode[]): string => {
    for (const item of items) {
      if (item.id === activeItem) return item.label;
      if (item.children) { const f = findLabel(item.children); if (f) return f; }
    }
    return '';
  };
  const activeItemLabel = findLabel(steps) || 'Screen';

  const parentActionsCls = 'item-actions absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover/atp:opacity-100 group-hover/atp:pointer-events-auto z-[2]';

  /* Scoped collision: only match items within the same parent */
  const scopedCollision = useCallback<typeof closestCenter>(
    (args) => {
      if (!dragSiblingIds.current) return closestCenter(args);
      const filtered = args.droppableContainers.filter(
        (c) => dragSiblingIds.current!.has(String(c.id)),
      );
      if (filtered.length === 0) return closestCenter(args);
      return closestCenter({ ...args, droppableContainers: filtered });
    },
    [],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveDragId(id);
    const siblings = findSiblingIds(steps, id);
    dragSiblingIds.current = siblings ? new Set(siblings) : null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    dragSiblingIds.current = null;
    if (!over || active.id === over.id) return;
    setSteps((prev) => reorderActionTree(prev, String(active.id), String(over.id)));
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    dragSiblingIds.current = null;
  };

  const handleModeChange = (mode: 'collapse' | 'filter') => {
    setHeaderMode(mode);
    setTypeFilters([]);
    setSearchQuery('');
    if (mode === 'collapse') {
      setExpandedItems(new Set(defaultExpanded));
    }
  };

  /* Render sortable children of a parent node */
  const renderChildGroup = (parent: ActionNode, childDepth: number): React.ReactNode => {
    if (!parent.children?.length) return null;

    if (parent.type === 'module') {
      /* Module → children: NOT sortable */
      return parent.children.map((child) => renderSubItem(child, childDepth));
    }

    if (parent.type === 'screen') {
      /* Screen → Containers (sortable) + Footer (fixed at end) */
      const containers = parent.children.filter((c) => c.type !== 'footer');
      const footer = parent.children.find((c) => c.type === 'footer');
      return (
        <>
          <SortableContext items={containers.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {containers.map((c) => (
              <SortableActionItem key={c.id} item={c} pl={atItemPl(childDepth, !!c.children)}
                activeItem={activeItem} expanded={expandedItems.has(c.id)}
                onSelect={setActiveItem} onToggle={toggleExpanded}
                childRenderer={(p) => renderChildGroup(p, childDepth + 1)} />
            ))}
          </SortableContext>
          {footer && renderSubItem(footer, childDepth)}
        </>
      );
    }

    return (
      <SortableContext items={parent.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {parent.children.map((c) => (
          <SortableActionItem key={c.id} item={c} pl={atItemPl(childDepth, !!c.children)}
            activeItem={activeItem} expanded={expandedItems.has(c.id)}
            onSelect={setActiveItem} onToggle={toggleExpanded}
            childRenderer={(p) => renderChildGroup(p, childDepth + 1)} />
        ))}
      </SortableContext>
    );
  };

  /* Non-sortable sub-item (footer in screen, children of module) */
  const renderSubItem = (item: ActionNode, depth: number): React.ReactNode => {
    const TypeIcon = actionNodeConfig[item.type].icon;
    const isGroup = !!item.children;
    const hasKids = isGroup && item.children!.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const pl = atItemPl(depth, isGroup);

    return (
      <SidebarMenuSubItem key={item.id}>
        <div className="group/atp relative">
          <SidebarMenuSubButton
            indent={1}
            isActive={activeItem === item.id}
            className="gap-0.5 group-hover/atp:text-[var(--sidebar-menu-text-active)] group-hover/atp:[&::before]:!opacity-50 group-hover/atp:[&::before]:![transform:scale(1)]"
            style={{ paddingLeft: pl, paddingRight: 4, paddingTop: 0, paddingBottom: 0, height: 32 }}
            onClick={() => setActiveItem(item.id)}
          >
            <span className="flex items-center shrink-0">
              {isGroup && (
                <span role="none" className={`${ghostBtnCls} transition-transform shrink-0`}
                  style={{ width: 24, height: 24, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleExpanded(item.id); } }}
                ><ChevronDownMd /></span>
              )}
              <span style={AT_ICON} className="inline-flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 relative z-[1]"><TypeIcon /></span>
            </span>
            <span className="flex-1 min-w-0 truncate text-left relative z-[1] group-hover/atp:pr-[30px]">{item.label}</span>
          </SidebarMenuSubButton>
          {isGroup && (
            <span className={parentActionsCls}>
              <ContainerAddMenu trigger={
                <button type="button" className={ghostBtnCls} style={{ width: AT_BTN, height: AT_BTN }}
                  aria-label="Add"><Plus /></button>
              } />
            </span>
          )}
        </div>
        {isGroup && (
          <SidebarMenuSub open={isExpanded} hasIcons>
            {hasKids && renderChildGroup(item, depth + 1)}
          </SidebarMenuSub>
        )}
      </SidebarMenuSubItem>
    );
  };

  /* Root-level items */
  const renderRootItems = (items: ActionNode[]): React.ReactNode => {
    return items.map((item) => {
      const TypeIcon = actionNodeConfig[item.type].icon;
      const isGroup = !!item.children;
      const hasKids = isGroup && item.children!.length > 0;
      const isExpanded = expandedItems.has(item.id);

      return (
        <SidebarMenuItem key={item.id} expanded={isExpanded}>
          <div className="group/atp relative">
            <SidebarMenuButton
              isActive={activeItem === item.id}
              className="group-hover/atp:text-[var(--sidebar-menu-text-active)] group-hover/atp:[&::before]:!opacity-50 group-hover/atp:[&::before]:![transform:scale(1)]"
              onClick={() => setActiveItem(item.id)}
            >
              <span className="flex items-center shrink-0" style={{ marginLeft: 4 }}>
                {isGroup ? (
                  <span role="none" className={`${ghostBtnCls} transition-transform`}
                    style={{ width: 24, height: 24, transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleExpanded(item.id); } }}
                  ><ChevronDownMd /></span>
                ) : (
                  <span style={{ width: 24, flexShrink: 0 }} />
                )}
                <span style={AT_ICON} className="inline-flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 relative z-[1]"><TypeIcon /></span>
              </span>
              <SidebarMenuButtonLabel className="group-hover/atp:pr-[52px]">{item.label}</SidebarMenuButtonLabel>
            </SidebarMenuButton>
            <span className={parentActionsCls}>
              {item.type === 'screen' ? (
                <ScreenAddMenu trigger={
                  <button type="button" className={ghostBtnCls} style={{ width: AT_BTN, height: AT_BTN }}
                    aria-label="Add"><Plus /></button>
                } />
              ) : (
                <ContainerAddMenu trigger={
                  <button type="button" className={ghostBtnCls} style={{ width: AT_BTN, height: AT_BTN }}
                    aria-label="Add"><Plus /></button>
                } />
              )}
            </span>
          </div>
          {isGroup && (
            <SidebarMenuSub open={isExpanded} hasIcons>
              {hasKids && renderChildGroup(item, 1)}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      );
    });
  };

  const renderFlatItems = (items: ActionNode[]): React.ReactNode => {
    return items.map((item) => {
      const TypeIcon = actionNodeConfig[item.type].icon;
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton isActive={activeItem === item.id} onClick={() => setActiveItem(item.id)}>
            <SidebarMenuButtonIcon style={iconSizeVar}><TypeIcon /></SidebarMenuButtonIcon>
            <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <>
      <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
        <SidebarProvider className="h-full" collapsible="none">
          <SidebarLayout className="h-full">
            <Sidebar className="!py-4">
              <SidebarHeader>
                <div className="flex items-center gap-2 w-full [&>div:first-child>div]:!p-0">
                  <div className="flex-1">
                    <SidebarInput size="md" pill={false} variant="soft" placeholder="Search..."
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClear={() => setSearchQuery('')} />
                  </div>
                  {headerMode === 'collapse' ? (
                    <Button
                      variant="soft" size="md" color="secondary" pill={false} uniform
                      aria-label="Collapse all" aria-pressed={!hasAnyExpanded}
                      onClick={toggleCollapseAll}
                    >
                      <ListChevronsDownUp />
                    </Button>
                  ) : (
                    <Menu>
                      <Menu.Trigger>
                        <Button variant="soft" size="md" color="secondary" pill={false} aria-label="Filter by type" uniform>
                          {hasTypeFilters ? <FilterBadge /> : <Filter />}
                        </Button>
                      </Menu.Trigger>
                      <Menu.Content minWidth="auto" align="end">
                        {actionFilterOptions.map((opt) => (
                          <Menu.CheckboxItem key={opt.value} checked={typeFilters.includes(opt.value)}
                            indicatorPosition="end" indicatorVariant="ghost"
                            onCheckedChange={(checked) => setTypeFilters((prev) =>
                              checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value))}
                            onSelect={(evt) => evt.preventDefault()}>
                            {opt.label}
                          </Menu.CheckboxItem>
                        ))}
                      </Menu.Content>
                    </Menu>
                  )}
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <DndContext id="sidebar-action-tree" sensors={sensors} collisionDetection={scopedCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}>
                      <SidebarMenu>
                        {isFlattening ? renderFlatItems(displaySteps) : renderRootItems(displaySteps)}
                      </SidebarMenu>
                    </DndContext>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-semibold mb-4">{activeItemLabel}</h1>
                <p className="text-secondary">
                  {isFlattening
                    ? 'Filtered results shown as a flat list.'
                    : 'Screen → Container / Footer → Elements. Containers and elements are drag-reorderable; Footer stays pinned.'}
                </p>
              </div>
            </SidebarInset>
          </SidebarLayout>
        </SidebarProvider>
      </div>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="action">
          <SegmentedControl<'collapse' | 'filter'>
            value={headerMode}
            onChange={handleModeChange}
            aria-label="Header action mode"
            size="xs"
          >
            <SegmentedControl.Option value="collapse">collapse</SegmentedControl.Option>
            <SegmentedControl.Option value="filter">filter</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />
      </div>
    </>
  );
}

 // =============================================
 // Scrollable
 // =============================================

export function SidebarScrollableDemo() {
   const [activeItem, setActiveItem] = useState('Overview');

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full">
        <SidebarLayout className="h-full">
            <Sidebar>
              <DemoSidebarHeader />
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
            </Sidebar>
            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
                <p className="text-secondary">
                  When content exceeds the container height, it scrolls vertically.
                </p>
              </div>
             </SidebarInset>
           </SidebarLayout>
         </SidebarProvider>
     </div>
   );
 }

 // =============================================
 // Text only
 // =============================================

export function SidebarTextOnlyDemo() {
   const [activeItem, setActiveItem] = useState('General');

   const categories = [
     { label: 'Settings', items: ['Your profile'] },
     { label: 'Organization', items: ['General', 'API keys', 'Admin keys'] },
     { label: 'People', items: ['People', 'Projects', 'Billing', 'Limits', 'Usage'] },
   ];

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible="none">
        <SidebarLayout className="h-full">
            <Sidebar variant="docs">
              <SidebarContent>
                {categories.map((cat) => (
                  <SidebarGroup key={cat.label}>
                    <SidebarGroupLabel size="lg">{cat.label}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {cat.items.map((item) => (
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
                  Text-only sidebar for settings pages. Uses <code>collapsible=&quot;none&quot;</code>.
                </p>
              </div>
             </SidebarInset>
           </SidebarLayout>
         </SidebarProvider>
     </div>
   );
 }

 // =============================================
 // Search
 // =============================================

export function SidebarSearchDemo() {
   const [activeItem, setActiveItem] = useState('Get started-Overview');
   const [searchValue, setSearchValue] = useState('');

   const docsSections = [
     { label: 'Get started', items: ['Overview', 'Quickstart', 'Models', 'Pricing', 'Libraries'] },
     { label: 'Core concepts', items: ['Text generation', 'Code generation', 'Images and vision', 'Structured output'] },
     { label: 'Agents', items: ['Overview', 'Build agents'] },
   ];

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible="none">
        <SidebarLayout className="h-full">
            <Sidebar variant="docs">
              <SidebarHeader>
                <div style={{ padding: '12px 0 8px', width: '100%' }}>
                  <SidebarInput
                    variant="soft"
                    placeholder="Search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onClear={() => setSearchValue('')}
                  />
                </div>
              </SidebarHeader>
              <SidebarContent>
                {docsSections.map((section) => (
                  <SidebarGroup key={section.label}>
                    <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => {
                          const id = `${section.label}-${item}`;
                          return (
                            <SidebarMenuItem key={id}>
                              <SidebarMenuSubButton
                                indent={0}
                                isActive={activeItem === id}
                                onClick={() => setActiveItem(id)}
                              >
                                {item}
                              </SidebarMenuSubButton>
                            </SidebarMenuItem>
                          );
                        })}
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
                  Search input stays fixed at the top while sidebar content scrolls.
                </p>
              </div>
             </SidebarInset>
           </SidebarLayout>
         </SidebarProvider>
     </div>
   );
 }

 // =============================================
 // Skeleton
 // =============================================

export function SidebarSkeletonDemo() {
   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full">
        <SidebarLayout className="h-full">
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
     </div>
   );
 }

 // =============================================
 // Badges (with pill control)
 // =============================================

export function SidebarBadgesDemo() {
  const [activeItem, setActiveItem] = useState('Overview');
  const [pill, setPill] = useState(false);

  const menuItems = [
    { label: 'Overview', icon: Home },
    { label: 'API Reference', icon: Code, badge: { text: 'New', color: 'info' as const } },
    { label: 'Playground', icon: Terminal, badge: { text: 'Beta', color: 'warning' as const } },
    { label: 'Fine-tuning', icon: SettingsCog, badge: { text: '3', color: 'info' as const } },
    { label: 'Batch API', icon: Storage, badge: { text: 'Updated', color: 'discovery' as const } },
    { label: 'Legacy Models', icon: FileDocument, badge: { text: 'Deprecated', color: 'danger' as const } },
    { label: 'Usage', icon: Analytics, badge: { text: '12', color: 'caution' as const } },
    { label: 'Billing', icon: CreditCard },
  ];

   return (
     <>
       <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
         <SidebarProvider className="h-full" collapsible="none">
           <SidebarLayout className="h-full">
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
                                  <Badge size="sm" color={item.badge.color} pill={pill}>
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
       </div>
       <div data-demo-controls style={controlsTableStyle}>
         <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
       </div>
     </>
   );
 }

// =============================================
// Footer cards
// =============================================

export function SidebarFooterCardsDemo() {
   const [activeItem, setActiveItem] = useState('Overview');

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible="icon">
        <SidebarLayout className="h-full">
            <Sidebar>
              <DemoSidebarHeader />
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

              <SidebarFooter>
                <SidebarCard dismissible onDismiss={() => { }}>
                  <SidebarCardTitleLink href="#" onClick={(e) => e.preventDefault()}>
                    Upgrade to Pro
                  </SidebarCardTitleLink>
                  <SidebarCardContent>
                    Unlock higher rate limits, priority support, and advanced features.
                  </SidebarCardContent>
                  <SidebarCardFooter>
                    <Button size="sm" pill color="primary">
                      View Plans
                    </Button>
                  </SidebarCardFooter>
                </SidebarCard>
              </SidebarFooter>
            </Sidebar>

            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-semibold mb-4">{activeItem}</h1>
                <p className="text-secondary">
                  Footer cards are hidden when the sidebar is collapsed.
                </p>
              </div>
             </SidebarInset>
           </SidebarLayout>
         </SidebarProvider>
     </div>
   );
 }

 // =============================================
 // Console (App-shell sidebar with hover flyout when collapsed)
 // =============================================

type ConsoleSection = {
  id: string;
  label: string;
  icon: React.ComponentType;
  badge?: string;
  items?: { id: string; label: string }[];
};

const consoleSections: ConsoleSection[] = [
  {
    id: 'build',
    label: 'Build',
    icon: SettingsWrench,
    items: [
      { id: 'workbench', label: 'Workbench' },
      { id: 'files', label: 'Files' },
      { id: 'skills', label: 'Skills' },
      { id: 'batches', label: 'Batches' },
    ],
  },
  {
    id: 'managed-agents',
    label: 'Managed Agents',
    icon: Branch,
    badge: 'New',
    items: [
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'agents', label: 'Agents' },
      { id: 'sessions', label: 'Sessions' },
      { id: 'environments', label: 'Environments' },
      { id: 'credential-vaults', label: 'Credential vaults' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: Bolt,
    items: [
      { id: 'analytics-usage', label: 'Usage' },
      { id: 'analytics-cost', label: 'Cost' },
      { id: 'analytics-logs', label: 'Logs' },
    ],
  },
  {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    items: [
      { id: 'cli-usage', label: 'Usage' },
      { id: 'cli-settings', label: 'Settings' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: Tools,
    items: [
      { id: 'api-keys', label: 'API keys' },
      { id: 'limits', label: 'Limits' },
      { id: 'members', label: 'Members' },
      { id: 'security', label: 'Security and compliance' },
    ],
  },
];

const consoleFlyoutItemCls =
  'flex items-center w-full text-left rounded-md px-3 py-1.5 text-sm text-primary cursor-pointer bg-transparent border-0 appearance-none select-none transition-colors hover:bg-[var(--sidebar-accent)] data-[active=true]:bg-[var(--sidebar-accent)] data-[active=true]:text-[var(--sidebar-menu-text-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]';

function ConsoleSectionItem({
  section,
  expanded,
  activeId,
  onToggle,
  onItemClick,
}: {
  section: ConsoleSection;
  expanded: boolean;
  activeId: string;
  onToggle: (id: string) => void;
  onItemClick: (sectionId: string, itemId: string) => void;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const Icon = section.icon;
  const hasItems = !!section.items && section.items.length > 0;
  const isSectionActive =
    activeId === section.id || section.items?.some((i) => i.id === activeId) === true;

  const button = (
    <SidebarMenuButton
      className="console-menu-button"
      isActive={!hasItems && isSectionActive}
      tooltip={isCollapsed && !hasItems ? section.label : undefined}
      onClick={() => {
        if (!hasItems) {
          onItemClick(section.id, section.id);
        } else if (!isCollapsed) {
          onToggle(section.id);
        }
      }}
    >
      <SidebarMenuButtonIcon>
        <Icon />
      </SidebarMenuButtonIcon>
      <SidebarMenuButtonLabel>{section.label}</SidebarMenuButtonLabel>
      {section.badge != null && (
        <SidebarMenuBadge>
          <Badge size="sm" color="info">
            {section.badge}
          </Badge>
        </SidebarMenuBadge>
      )}
      {hasItems && (
        <SidebarMenuChevron
          className="ml-auto transition-transform"
          style={{
            transform: !isCollapsed && expanded ? 'rotate(90deg)' : undefined,
          }}
        />
      )}
    </SidebarMenuButton>
  );

  if (isCollapsed && hasItems) {
    return (
      <SidebarMenuItem>
        <Popover showOnHover hoverOpenDelay={80}>
          <Popover.Trigger>{button}</Popover.Trigger>
          <Popover.Content
            side="right"
            sideOffset={8}
            minWidth={220}
            align="start"
            autoFocus={false}
          >
            <div className="p-1">
              <div className="px-3 py-2 text-xs font-medium text-tertiary">
                {section.label}
              </div>
              {section.items!.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-active={activeId === item.id ? 'true' : undefined}
                  className={consoleFlyoutItemCls}
                  onClick={() => onItemClick(section.id, item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem expanded={!isCollapsed && expanded}>
      {button}
      {hasItems && (
        <SidebarMenuSub open={!isCollapsed && expanded} hasIcons>
          {section.items!.map((item) => (
            <SidebarMenuSubItem key={item.id}>
              <SidebarMenuSubButton
                indent={1}
                isActive={activeId === item.id}
                onClick={() => onItemClick(section.id, item.id)}
              >
                {item.label}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

const ConsoleDemoContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  bordered: boolean;
  setBordered: (v: boolean) => void;
} | null>(null);

function SidebarConsoleDemoPreview() {
  const ctx = useContext(ConsoleDemoContext);
  const [activeId, setActiveId] = useState('workbench');
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'build',
    'managed-agents',
    'analytics',
    'cli',
    'manage',
  ]);
  const open = ctx?.open ?? true;

  const handleToggle = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleItemClick = (_sectionId: string, itemId: string) => {
    setActiveId(itemId);
  };

  const activeLabel =
    consoleSections.flatMap((s) => [s, ...(s.items ?? [])]).find((i) => i.id === activeId)
      ?.label ?? 'Workbench';

  const bordered = ctx?.bordered ?? false;

  return (
    <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
      <style>{`
        .console-demo .console-content { -webkit-mask-image: none; mask-image: none; padding-top: 0; }
        .console-demo .console-menu-button > span > span:first-child > svg { width: 16px; height: 16px; }
        .console-demo .console-workspace-chevron {
          transition: opacity var(--sidebar-collapse-duration) var(--cubic-move);
        }
        .console-demo[data-sidebar="collapsed"] .console-menu-button > span > span:nth-child(2),
        .console-demo[data-sidebar="collapsed"] .console-menu-button > span > span:nth-child(3) { display: none; }
        .console-demo[data-sidebar="collapsed"] .console-workspace-chevron { opacity: 0; pointer-events: none; }
        .console-demo .console-footer { padding-top: 8px; padding-bottom: 8px; }
        .console-demo .console-footer-separator { display: block; margin-top: 8px; margin-bottom: 8px; }
        .console-demo .console-account-button > span { height: auto; min-height: 44px; padding-top: 6px; padding-bottom: 6px; }
        .console-trigger-kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          min-width: 18px;
          height: 16px;
          font-size: 10px;
          font-family: inherit;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
      <SidebarProvider
        className="h-full console-demo"
        collapsible="icon"
        open={open}
        onOpenChange={ctx?.setOpen}
      >
        <SidebarLayout className="h-full">
          <Sidebar>
            <DemoSidebarHeader title="Console" />

            <SidebarContent className="console-content">
              <SidebarGroup className="console-group">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <Menu>
                        <Menu.Trigger>
                          <SidebarMenuButton className="console-menu-button" tooltip="Default">
                            <SidebarMenuButtonIcon>
                              <Cube />
                            </SidebarMenuButtonIcon>
                            <SidebarMenuButtonLabel>Default</SidebarMenuButtonLabel>
                            <ChevronUpDown
                              className="ml-auto console-workspace-chevron"
                              style={{ width: 14, height: 14 }}
                            />
                          </SidebarMenuButton>
                        </Menu.Trigger>
                        <Menu.Content minWidth={200} align="start">
                          <Menu.Item onSelect={() => {}}>Default</Menu.Item>
                          <Menu.Item onSelect={() => {}}>Production</Menu.Item>
                          <Menu.Item onSelect={() => {}}>Staging</Menu.Item>
                          <Menu.Separator />
                          <Menu.Item onSelect={() => {}}>
                            <Plus /> New workspace
                          </Menu.Item>
                        </Menu.Content>
                      </Menu>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="console-group">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {consoleSections.map((section) => (
                      <ConsoleSectionItem
                        key={section.id}
                        section={section}
                        expanded={expandedSections.includes(section.id)}
                        activeId={activeId}
                        onToggle={handleToggle}
                        onItemClick={handleItemClick}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="console-footer">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="console-menu-button" tooltip="Documentation">
                    <SidebarMenuButtonIcon>
                      <Book />
                    </SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>Documentation</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator className="console-footer-separator" />
                <SidebarMenuItem>
                  <Menu>
                    <Menu.Trigger>
                      <SidebarMenuButton
                        className="console-menu-button console-account-button"
                        tooltip="Alex · Acme Inc"
                      >
                        <SidebarMenuButtonIcon>
                          <Avatar name="Alex" size={24} color="secondary" variant="solid" />
                        </SidebarMenuButtonIcon>
                        <SidebarMenuButtonLabel>
                          <span className="flex flex-col leading-tight">
                            <span className="font-medium text-primary text-sm">Alex</span>
                            <span className="text-tertiary text-xs">Admin</span>
                          </span>
                        </SidebarMenuButtonLabel>
                        <ChevronDownMd className="ml-auto" style={{ width: 14, height: 14 }} />
                      </SidebarMenuButton>
                    </Menu.Trigger>
                    <Menu.Content minWidth={260} align="start" side="top">
                      <Menu.Item disabled>
                        <span className="text-tertiary text-sm">alex@example.com</span>
                      </Menu.Item>
                      <Menu.Item onSelect={() => {}}>
                        <BuildingWorkspace /> Acme Inc
                        <span className="ml-auto text-xs text-tertiary">API plan</span>
                      </Menu.Item>
                      <Menu.Separator />
                      <Menu.Item onSelect={() => {}}>
                        <SettingsCog /> Organization settings
                      </Menu.Item>
                      <Menu.Separator />
                      <Menu.Item onSelect={() => {}}>
                        <Chat /> Feedback
                      </Menu.Item>
                      <Menu.Item onSelect={() => {}}>
                        <Help /> Get help
                      </Menu.Item>
                      <Menu.Item onSelect={() => {}}>
                        <InfoCircle /> Legal center
                        <ChevronRightMd className="ml-auto" />
                      </Menu.Item>
                      <Menu.Separator />
                      <Menu.Item onSelect={() => {}}>
                        <Logout /> Log out
                      </Menu.Item>
                    </Menu.Content>
                  </Menu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset>
            <div className="p-6">
              <h1 className="text-2xl font-semibold mb-2">{activeLabel}</h1>
              <p className="text-secondary">
                Hover the icons when collapsed to reveal a flyout with the section&apos;s items.
              </p>
            </div>
          </SidebarInset>
        </SidebarLayout>
      </SidebarProvider>
    </div>
  );
}

function SidebarConsoleDemoControls() {
  const ctx = useContext(ConsoleDemoContext);
  if (!ctx) return null;
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="open" value={ctx.open} onChange={ctx.setOpen} />
      <DemoControlBoolean name="bordered" value={ctx.bordered} onChange={ctx.setBordered} />
    </div>
  );
}

export function SidebarConsoleDemo() {
  const [open, setOpen] = useState(true);
  const [bordered, setBordered] = useState(false);
  return (
    <ConsoleDemoContext.Provider value={{ open, setOpen, bordered, setBordered }}>
      <SidebarConsoleDemoPreview />
      <SidebarConsoleDemoControls />
    </ConsoleDemoContext.Provider>
  );
}

 // =============================================
 // Header sizes (with controls)
 // =============================================

const dashboardSections = [
  { label: 'Project', items: [{ icon: Home, label: 'Overview' }, { icon: Folder, label: 'Projects' }, { icon: Analytics, label: 'Analytics' }] },
  { label: 'System', items: [{ icon: Members, label: 'Team' }, { icon: SettingsCog, label: 'Settings' }] },
];

const docsSectionsHeaderSizes = [
  { label: 'Getting Started', items: ['Introduction', 'Installation', 'Quick Start'] },
  { label: 'Components', items: ['Button', 'Input', 'Modal', 'Sidebar'] },
];

type HeaderSizesContextValue = {
  size: 'sm' | 'lg';
  setSize: (s: 'sm' | 'lg') => void;
  activeItem: string;
  setActiveItem: (s: string) => void;
};

const HeaderSizesContext = createContext<HeaderSizesContextValue | null>(null);

export function SidebarHeaderSizesDemoRoot({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState<'sm' | 'lg'>('sm');
  const [activeItem, setActiveItem] = useState('Overview');
  const value: HeaderSizesContextValue = {
    size,
    setSize,
    activeItem,
    setActiveItem,
  };
  return (
    <HeaderSizesContext.Provider value={value}>
      {children}
    </HeaderSizesContext.Provider>
  );
}

export function SidebarHeaderSizesDemoPreview() {
   const ctx = useContext(HeaderSizesContext);
   const size = ctx?.size ?? 'sm';
   const activeItem = ctx?.activeItem ?? 'Overview';
   const setActiveItem = ctx?.setActiveItem ?? (() => { });

   return (
     <div data-demo-stage className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
      {size === 'sm' ? (
        <SidebarProvider className="h-full" collapsible="none" key="sm">
          <SidebarLayout className="h-full">
              <Sidebar>
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
                  <p className="text-secondary">Compact headers with tertiary color.</p>
                </div>
              </SidebarInset>
            </SidebarLayout>
          </SidebarProvider>
        ) : (
          <SidebarProvider className="h-full" collapsible="none" key="lg">
            <SidebarLayout className="h-full">
              <Sidebar variant="docs">
                <SidebarContent>
                  {docsSectionsHeaderSizes.map((section) => (
                    <SidebarGroup key={section.label}>
                      <SidebarGroupLabel size="lg">{section.label}</SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {section.items.map((item) => (
                            <SidebarMenuItem key={item}>
                              <SidebarMenuButton isActive={activeItem === item} onClick={() => setActiveItem(item)}>
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
                  <p className="text-secondary">Prominent headers with primary color.</p>
                </div>
              </SidebarInset>
             </SidebarLayout>
           </SidebarProvider>
         )}
     </div>
   );
 }

 // =============================================
 // Shared controls table UI (Storybook-style)
 // =============================================

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',

  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlBoolean({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  const controlId = useId();

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

export function SidebarHeaderSizesDemo() {
  return (
    <SidebarHeaderSizesDemoRoot>
      <SidebarHeaderSizesDemoPreview />
      <SidebarHeaderSizesDemoControls />
    </SidebarHeaderSizesDemoRoot>
  );
}

function SidebarHeaderSizesDemoControls() {
  const ctx = useContext(HeaderSizesContext);
  if (!ctx) return null;
  const { size, setSize, setActiveItem } = ctx;
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="size">
        <SegmentedControl<'sm' | 'lg'>
          value={size}
          onChange={(next) => {
            setSize(next);
            setActiveItem(next === 'sm' ? 'Overview' : 'Introduction');
          }}
          aria-label="Group label size"
          size="xs"
        >
          <SegmentedControl.Option value="sm">sm</SegmentedControl.Option>
          <SegmentedControl.Option value="lg">lg</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
    </div>
  );
}

// =============================================
// Mobile menu (with mobile / nested / icons controls)
// =============================================

function MobileMenuInner({ mobile, nested, icons }: { mobile: boolean; nested: boolean; icons: boolean }) {
  const { openMobile, setOpenMobile } = useSidebar();
  const [activeItem, setActiveItem] = useState({ id: 'overview', label: 'Overview' });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Recursive render for nested items (matches Storybook's renderNestedItems)
  const renderNestedItems = (
    items: NavItem[],
    depth: number = 0,
    onSelect?: (item: { id: string; label: string }) => void,
  ) => {
    return items.map((item) => {
      const hasChildren = item.items && item.items.length > 0;
      const isExpanded = expandedSections.includes(item.id);

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
        );
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            indent={depth as 0 | 1 | 2 | 3}
            isActive={activeItem.id === item.id}
            onClick={() => {
              setActiveItem({ id: item.id, label: item.label });
              onSelect?.({ id: item.id, label: item.label });
            }}
          >
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    });
  };

  // Desktop: simple flat nav with icons (default)
  const renderDesktopSimpleNav = () => (
    <Sidebar>
      <DemoSidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );

  // Desktop: simple flat nav without icons
  const renderDesktopSimpleNavNoIcons = () => (
    <Sidebar>
      <DemoSidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} tooltip={item.label} onClick={() => setActiveItem({ id: item.label.toLowerCase(), label: item.label })}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );

  // Desktop: nested docs-style (text only, deep nesting)
  const renderDesktopNestedNav = () => (
    <Sidebar variant="docs" style={{ width: '280px' }}>
      <SidebarContent>
        {nestedDocsSections.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{section.items && renderNestedItems(section.items, 0)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );

  // Desktop: nested with icons (2 levels)
  const renderDesktopNestedNavWithIcons = () => (
    <Sidebar style={{ width: '280px' }}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nestedIconsSections.map((item) => {
                const isExpanded = expandedSections.includes(item.id);
                const Icon = item.icon;
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
                            onClick={() => setActiveItem({ id: child.id, label: child.label })}
                          >
                            {child.label}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );

  const renderDesktopSidebar = () => {
    if (!nested) return icons ? renderDesktopSimpleNav() : renderDesktopSimpleNavNoIcons();
    if (icons) return renderDesktopNestedNavWithIcons();
    return renderDesktopNestedNav();
  };

  // Mobile view
  if (mobile) {
    // Mobile: nested docs-style with close callback
    const renderMobileNestedNavWithClose = () => (
      <SidebarContent>
        {nestedDocsSections.map((section) => (
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
    );

    // Mobile: nested with icons with close callback
    const renderMobileNestedWithIconsAndClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nestedIconsSections.map((item) => {
                const isExpanded = expandedSections.includes(item.id);
                const Icon = item.icon;
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
                            onClick={() => {
                              setActiveItem({ id: child.id, label: child.label });
                              setOpenMobile(false);
                            }}
                          >
                            {child.label}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    // Mobile: simple flat nav with close callback (with icons)
    const renderMobileSimpleNavWithClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    // Mobile: simple flat nav without icons with close callback
    const renderMobileSimpleNavNoIconsWithClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
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
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    const renderMobileContent = () => {
      if (!nested) return icons ? renderMobileSimpleNavWithClose() : renderMobileSimpleNavNoIconsWithClose();
      if (icons) return renderMobileNestedWithIconsAndClose();
      return renderMobileNestedNavWithClose();
    };

    return (
      <div
        data-mobile-menu={openMobile ? 'visible' : 'hidden'}
        style={{
          width: 375,
          height: 667,
          background: 'var(--gray-75, #f3f3f3)',
          overflow: 'hidden',
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <header className="flex items-center" style={{ justifyContent: 'flex-end', height: 54, padding: '0 8px' }}>
          <SidebarMobileMenuButton />
        </header>
        <div
          style={{
            margin: 8,
            marginTop: 0,
            background: 'var(--color-surface, #ffffff)',
            boxShadow: 'var(--sidebar-inset-shadow, 0 1px 3px rgba(0,0,0,.08))',
            borderRadius: 8,
            height: 'calc(100% - 54px - 8px)',
            overflow: 'auto',
          }}
        >
          {openMobile ? (
            <div style={{ padding: 12 }}>
              {renderMobileContent()}
              {!nested && (
                <SidebarCard dismissible onDismiss={() => { }}>
                  <SidebarCardTitleLink href="#" onClick={(e) => e.preventDefault()}>
                    Upgrade to Pro
                  </SidebarCardTitleLink>
                  <SidebarCardContent>
                    Unlock higher rate limits, priority support, and advanced features.
                  </SidebarCardContent>
                  <SidebarCardFooter>
                    <Button size="sm" pill color="primary">View Plans</Button>
                  </SidebarCardFooter>
                </SidebarCard>
              )}
            </div>
          ) : (
            <div style={{ padding: 24 }}>
              <h1 className="text-2xl font-semibold mb-4">{activeItem.label}</h1>
              <p className="text-secondary">
                Click the menu button to open the sidebar and select a different item.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <SidebarLayout className="h-full">
        {renderDesktopSidebar()}
        <SidebarInset>
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">{activeItem.label}</h1>
            <p className="text-secondary">
              Toggle mobile to see the mobile sidebar.
            </p>
          </div>
         </SidebarInset>
       </SidebarLayout>
   );
 }

 type MobileDemoContextValue = {
  mobile: boolean;
  setMobile: (v: boolean) => void;
  nested: boolean;
  setNested: (v: boolean) => void;
  icons: boolean;
  setIcons: (v: boolean) => void;
  bordered: boolean;
  setBordered: (v: boolean) => void;
};

const MobileDemoContext = createContext<MobileDemoContextValue | null>(null);

export function SidebarMobileDemoRoot({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [nested, setNested] = useState(false);
  const [icons, setIcons] = useState(false);
  const [bordered, setBordered] = useState(true);
  const value: MobileDemoContextValue = { mobile, setMobile, nested, setNested, icons, setIcons, bordered, setBordered };
  return (
    <MobileDemoContext.Provider value={value}>
      {children}
    </MobileDemoContext.Provider>
  );
}

export function SidebarMobileDemoPreview() {
   const ctx = useContext(MobileDemoContext);
   const mobile = ctx?.mobile ?? false;
   const nested = ctx?.nested ?? false;
   const icons = ctx?.icons ?? false;
   const bordered = ctx?.bordered ?? true;
   const key = `${mobile}-${nested}-${icons}`;
   return (
     <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible={mobile ? 'offcanvas' : icons ? 'icon' : 'none'} key={key}>
        <MobileMenuInner mobile={mobile} nested={nested} icons={icons} />
      </SidebarProvider>
    </div>
  );
}

function SidebarMobileDemoControls() {
  const ctx = useContext(MobileDemoContext);
  if (!ctx) return null;
  const { mobile, setMobile, nested, setNested, icons, setIcons, bordered, setBordered } = ctx;
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="mobile" value={mobile} onChange={setMobile} />
      <DemoControlBoolean name="nested" value={nested} onChange={setNested} />
      <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
      <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />
    </div>
  );
}

export function SidebarMobileDemo() {
  return (
    <SidebarMobileDemoRoot>
      <SidebarMobileDemoControls />
      <SidebarMobileDemoPreview />
    </SidebarMobileDemoRoot>
  );
}
