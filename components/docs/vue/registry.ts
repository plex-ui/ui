import { compile, type CompilerOptions } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { registerRuntimeCompiler, type Component, type RenderFunction } from 'vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@plexui/vue/components/Accordion';
import { Avatar, AvatarGroup } from '@plexui/vue/components/Avatar';
import { Badge } from '@plexui/vue/components/Badge';
import { Button, ButtonLink, CopyButton } from '@plexui/vue/components/Button';
import { Checkbox } from '@plexui/vue/components/Checkbox';
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
import { FieldError } from '@plexui/vue/components/FieldError';
import { FloatingLabelInput } from '@plexui/vue/components/FloatingLabelInput';
import { CircularProgress, LoadingDots, LoadingIndicator } from '@plexui/vue/components/Indicator';
import { Image } from '@plexui/vue/components/Image';
import { Label } from '@plexui/vue/components/Label';
import { OTPInput } from '@plexui/vue/components/OTPInput';
import { PlexUIProvider } from '@plexui/vue/components/PlexUIProvider';
import { Progress } from '@plexui/vue/components/Progress';
import { SegmentedControl, SegmentedControlOption, SegmentedControlTab } from '@plexui/vue/components/SegmentedControl';
import { Separator } from '@plexui/vue/components/Separator';
import { ShimmerableText, ShimmerText } from '@plexui/vue/components/ShimmerText';
import { Skeleton } from '@plexui/vue/components/Skeleton';
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
  Animate,
  AnimateLayout,
  AnimateLayoutGroup,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ButtonLink,
  Checkbox,
  CircularProgress,
  CopyButton,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FieldError,
  FloatingLabelInput,
  Image,
  Label,
  LoadingDots,
  LoadingIndicator,
  OTPInput,
  PlexUIProvider,
  Progress,
  SegmentedControl,
  SegmentedControlOption,
  SegmentedControlTab,
  Separator,
  ShimmerableText,
  ShimmerText,
  Skeleton,
  Switch,
  // <TransitionGroup> always compiles to Vue's built-in, so templates use the alias
  PlexTransitionGroup,
  SlotTransitionGroup,
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
};

// Icons whose names clash with a component (Card, Menu, Sidebar, ...) are
// also registered as `<Name>Icon`; the component keeps the bare name.
const icons: Record<string, Component> = {};
for (const [name, icon] of Object.entries(Icons as Record<string, Component>)) {
  icons[name in components ? `${name}Icon` : name] = icon;
}

/** Everything a preview template can use without importing it. */
export const vueComponents: Record<string, Component> = { ...icons, ...components };
