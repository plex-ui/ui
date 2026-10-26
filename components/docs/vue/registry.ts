import { compile, type CompilerOptions } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { registerRuntimeCompiler, type Component, type RenderFunction } from 'vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@plexui/vue/components/Accordion';
import { Alert } from '@plexui/vue/components/Alert';
import { Avatar, AvatarGroup } from '@plexui/vue/components/Avatar';
import { Badge } from '@plexui/vue/components/Badge';
import { Button, ButtonLink, CopyButton } from '@plexui/vue/components/Button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@plexui/vue/components/ButtonGroup';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@plexui/vue/components/Card';
import { Checkbox } from '@plexui/vue/components/Checkbox';
import {
  CodeBlock,
  CodeBlockBase,
  CodeBlockBaseCode,
  CodeBlockBaseCopyButton,
  CollapsibleCodeBlock,
} from '@plexui/vue/components/CodeBlock';
import { DataTable, DataTableColumnHeader, DataTablePagination } from '@plexui/vue/components/DataTable';
import { DateInput } from '@plexui/vue/components/DateInput';
import { DatePicker } from '@plexui/vue/components/DatePicker';
import { DateRangePicker } from '@plexui/vue/components/DateRangePicker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@plexui/vue/components/Dialog';
import {
  EmptyMessage,
  EmptyMessageActionRow,
  EmptyMessageDescription,
  EmptyMessageIcon,
  EmptyMessageTitle,
} from '@plexui/vue/components/EmptyMessage';
import { Field } from '@plexui/vue/components/Field';
import { FieldError } from '@plexui/vue/components/FieldError';
import { FileCard, FileCardGroup, FileUpload } from '@plexui/vue/components/FileUpload';
import { FloatingLabelInput } from '@plexui/vue/components/FloatingLabelInput';
import { FloatingLabelSelect } from '@plexui/vue/components/FloatingLabelSelect';
import { CircularProgress, LoadingDots, LoadingIndicator } from '@plexui/vue/components/Indicator';
import { Image } from '@plexui/vue/components/Image';
import { Input, InputAdornmentButton } from '@plexui/vue/components/Input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@plexui/vue/components/InputGroup';
import { Label } from '@plexui/vue/components/Label';
import { Markdown } from '@plexui/vue/components/Markdown';
import { MarkdownEditor } from '@plexui/vue/components/MarkdownEditor';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuItemActions,
  MenuLabel,
  MenuLink,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@plexui/vue/components/Menu';
import { OTPInput } from '@plexui/vue/components/OTPInput';
import { PlexUIProvider } from '@plexui/vue/components/PlexUIProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@plexui/vue/components/Popover';
import { Progress } from '@plexui/vue/components/Progress';
import {
  ProgressSteps,
  ProgressStepsDescription,
  ProgressStepsStep,
  ProgressStepsTitle,
} from '@plexui/vue/components/ProgressSteps';
import { RadioGroup, RadioGroupItem } from '@plexui/vue/components/RadioGroup';
import { SegmentedControl, SegmentedControlOption, SegmentedControlTab } from '@plexui/vue/components/SegmentedControl';
import { Select } from '@plexui/vue/components/Select';
import { SelectControl } from '@plexui/vue/components/SelectControl';
import { Separator } from '@plexui/vue/components/Separator';
import { ShimmerableText, ShimmerText } from '@plexui/vue/components/ShimmerText';
import {
  Sidebar,
  SidebarCard,
  SidebarCardContent,
  SidebarCardFooter,
  SidebarCardHeader,
  SidebarCardTitle,
  SidebarCardTitleLink,
  SidebarContent,
  SidebarFooter,
  SidebarFooterLinks,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuAction,
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
  SidebarMobile,
  SidebarMobileFooter,
  SidebarMobileHeader,
  SidebarMobileMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@plexui/vue/components/Sidebar';
import { Skeleton } from '@plexui/vue/components/Skeleton';
import { Slider } from '@plexui/vue/components/Slider';
import { StatCard } from '@plexui/vue/components/StatCard';
import { Switch } from '@plexui/vue/components/Switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@plexui/vue/components/Table';
import { Tabs, TabsOption, TabsTab } from '@plexui/vue/components/Tabs';
import { TagInput } from '@plexui/vue/components/TagInput';
import { Textarea } from '@plexui/vue/components/Textarea';
import { TextLink } from '@plexui/vue/components/TextLink';
import { Toaster } from '@plexui/vue/components/Toast';
import {
  CopyTooltip,
  Tooltip,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TooltipTriggerDecorator,
} from '@plexui/vue/components/Tooltip';
import {
  Animate,
  AnimateLayout,
  AnimateLayoutGroup,
  PlexTransitionGroup,
  SlotTransitionGroup,
} from '@plexui/vue/components/Transition';
import * as Icons from '@plexui/vue/components/Icon';

// The `vue` package resolves to the runtime-only build, so preview templates
// are compiled here, the way Vue's full build does it. The code a page shows
// is the template that runs.
type CompiledRender = RenderFunction & { _rc?: boolean };

const renderCache = new Map<string, CompiledRender>();

function compileToFunction(template: string | HTMLElement, options?: CompilerOptions): CompiledRender {
  const source = typeof template === 'string' ? template : template.innerHTML;
  const cached = renderCache.get(source);
  if (cached) return cached;

  const { code } = compile(source, {
    hoistStatic: true,
    ...options,
    onError: (error) => console.error(`[VuePreview] ${error.message}`),
  });
  // Same as Vue's full build: the compiled code reads helpers off `Vue`
  const render: CompiledRender = new Function('Vue', code)(Vue);
  render._rc = true;
  renderCache.set(source, render);
  return render;
}

registerRuntimeCompiler(compileToFunction as Parameters<typeof registerRuntimeCompiler>[0]);

const components: Record<string, Component> = {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Animate,
  AnimateLayout,
  AnimateLayoutGroup,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  ButtonLink,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  CircularProgress,
  CodeBlock,
  CodeBlockBase,
  CodeBlockBaseCode,
  CodeBlockBaseCopyButton,
  CollapsibleCodeBlock,
  CopyButton,
  CopyTooltip,
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DateInput,
  DatePicker,
  DateRangePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyMessage,
  EmptyMessageActionRow,
  EmptyMessageDescription,
  EmptyMessageIcon,
  EmptyMessageTitle,
  Field,
  FieldError,
  FileCard,
  FileCardGroup,
  FileUpload,
  FloatingLabelInput,
  FloatingLabelSelect,
  Image,
  Input,
  InputAdornmentButton,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  Label,
  LoadingDots,
  LoadingIndicator,
  Markdown,
  MarkdownEditor,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuItemActions,
  MenuLabel,
  MenuLink,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  OTPInput,
  // <TransitionGroup> always compiles to Vue's built-in, so templates use the alias
  PlexTransitionGroup,
  PlexUIProvider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressSteps,
  ProgressStepsDescription,
  ProgressStepsStep,
  ProgressStepsTitle,
  RadioGroup,
  RadioGroupItem,
  SegmentedControl,
  SegmentedControlOption,
  SegmentedControlTab,
  Select,
  SelectControl,
  Separator,
  ShimmerableText,
  ShimmerText,
  Sidebar,
  SidebarCard,
  SidebarCardContent,
  SidebarCardFooter,
  SidebarCardHeader,
  SidebarCardTitle,
  SidebarCardTitleLink,
  SidebarContent,
  SidebarFooter,
  SidebarFooterLinks,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuAction,
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
  SidebarMobile,
  SidebarMobileFooter,
  SidebarMobileHeader,
  SidebarMobileMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  Skeleton,
  Slider,
  SlotTransitionGroup,
  StatCard,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsOption,
  TabsTab,
  TagInput,
  Textarea,
  TextLink,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TooltipTriggerDecorator,
};

// Icons whose names clash with a component (Card, Menu, Sidebar, ...) are
// also registered as `<Name>Icon`; the component keeps the bare name.
const icons: Record<string, Component> = {};
for (const [name, icon] of Object.entries(Icons as Record<string, Component>)) {
  icons[name in components ? `${name}Icon` : name] = icon;
}

/** Everything a preview template can use without importing it. */
export const vueComponents: Record<string, Component> = { ...icons, ...components };
