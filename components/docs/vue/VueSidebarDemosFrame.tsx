'use client';

import { defineComponent, h, ref, watch, type PropType } from 'vue';
import { Page, PageActions, PageBar, PageContent, PageHeader, PageLeading, PageTitle } from '@plexui/vue/components/Page';
import { Sidebar, SidebarInset, SidebarMobile, SidebarMobileMenuButton, SidebarProvider, useSidebar as sidebarContext, type SidebarCollapsible, type SidebarProviderVariant } from '@plexui/vue/components/Sidebar';
import { useBreakpoint as breakpoint } from '@plexui/vue/composables/useBreakpoints';
import { isSidebarNavigationSelection } from '../SidebarDemos.utils';
import s from '../SidebarDemos.module.css';

export const ResponsiveSidebarProvider = defineComponent({
  name: 'ResponsiveSidebarProvider',
  inheritAttrs: false,
  props: {
    open: { type: Boolean, default: undefined },
    collapsible: { type: String as PropType<SidebarCollapsible>, default: 'offcanvas' },
    variant: { type: String as PropType<SidebarProviderVariant>, default: 'sidebar' },
  },
  setup(props, { attrs, slots }) {
    const wide = breakpoint('md');
    return () => h(SidebarProvider, {
      ...attrs,
      ...props,
      class: [s.Frame, attrs.class],
      open: wide.value ? props.open : true,
      variant: wide.value ? props.variant : 'sidebar',
    }, slots);
  },
});

export const ResponsiveSidebar = defineComponent({
  name: 'ResponsiveSidebar',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    const sidebar = sidebarContext();
    const closeRef = ref<{ $el: HTMLButtonElement } | null>(null);
    watch(() => sidebar.isMobile && sidebar.openMobile, (open, _, cleanup) => {
      if (!open) return;
      const trigger = document.activeElement;
      closeRef.value?.$el.focus();
      cleanup(() => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); });
    }, { flush: 'post' });
    return () => sidebar.isMobile
      ? h(SidebarMobile, { contained: true, class: s.Drawer, inert: sidebar.openMobile ? undefined : true, role: 'navigation', 'aria-label': 'Main navigation' }, () =>
        h(Page, null, () => [
          h(PageHeader, { background: 'solid' }, () => h(PageBar, null, () => [
            h(PageTitle, null, () => 'Navigation'),
            h(PageActions, null, () => h(SidebarMobileMenuButton, { ref: closeRef })),
          ])),
          h(PageContent, { class: s.NavigationContent, onClick: (event: MouseEvent) => {
            if (!event.defaultPrevented && isSidebarNavigationSelection(event.target)) sidebar.setOpenMobile(false);
          } }, slots),
        ]))
      : h(Sidebar, attrs, slots);
  },
});

export const SidebarDemoPage = defineComponent({
  name: 'SidebarDemoPage',
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    const sidebar = sidebarContext();
    return () => h(SidebarInset, { class: s.Inset, inert: sidebar.isMobile && sidebar.openMobile ? true : undefined }, () => sidebar.isMobile
      ? h(Page, null, () => [
        h(PageHeader, null, () => h(PageBar, null, () => [
          h(PageLeading, null, () => h(SidebarMobileMenuButton)),
          h(PageTitle, null, () => props.title),
        ])),
        h(PageContent, null, slots),
      ])
      : h('div', { class: 'p-6' }, [h('h1', { class: 'text-2xl font-semibold mb-4' }, props.title), slots.default?.()]));
  },
});
