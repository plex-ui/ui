"use client"

import clsx from "clsx"
import { type ComponentProps, type Ref, useCallback } from "react"
import { Accordion as RadixAccordion } from "radix-ui"
import { ChevronDownMd } from "../Icon"
import s from "@plexui/styles/components/Accordion/Accordion.module.css"
import { attachAccordionMotion } from "../../lib/accordionMotion"

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type AccordionProps = ComponentProps<typeof RadixAccordion.Root> & {
  className?: string
}

const MOTION_CLASSES = { root: s.Root, item: s.Item, content: s.Content }

const AccordionRoot = ({
  className,
  ref,
  ...restProps
}: AccordionProps) => {
  // What follows an item slides as it opens and closes (lib/accordionMotion), on whatever element Radix renders now,
  // and the consumer's ref keeps its own cleanup
  const setNode = useCallback(
    (element: HTMLDivElement | null) => {
      const detach = element ? attachAccordionMotion(element, MOTION_CLASSES) : undefined
      const refCleanup = typeof ref === "function" ? ref(element) : ref ? void (ref.current = element) : undefined
      return () => {
        detach?.()
        if (typeof refCleanup === "function") refCleanup()
        else if (typeof ref === "function") ref(null)
        else if (ref) ref.current = null
      }
    },
    [ref],
  )

  return <RadixAccordion.Root ref={setNode} className={clsx(s.Root, className)} {...restProps} />
}

/* ------------------------------------------------------------------ */
/*  Item                                                               */
/* ------------------------------------------------------------------ */

export type AccordionItemProps = ComponentProps<typeof RadixAccordion.Item> & {
  className?: string
}

const AccordionItem = ({
  className,
  ...restProps
}: AccordionItemProps) => (
  <RadixAccordion.Item className={clsx(s.Item, className)} {...restProps} />
)

/* ------------------------------------------------------------------ */
/*  Trigger                                                            */
/* ------------------------------------------------------------------ */

export type AccordionTriggerProps = ComponentProps<
  typeof RadixAccordion.Trigger
> & {
  className?: string
  ref?: Ref<HTMLButtonElement>
}

const AccordionTrigger = ({
  className,
  children,
  ref,
  ...restProps
}: AccordionTriggerProps) => (
  <RadixAccordion.Header className={s.Header}>
    <RadixAccordion.Trigger
      ref={ref}
      className={clsx(s.Trigger, className)}
      {...restProps}
    >
      {children}
      <ChevronDownMd className={s.Chevron} aria-hidden />
    </RadixAccordion.Trigger>
  </RadixAccordion.Header>
)

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

export type AccordionContentProps = ComponentProps<
  typeof RadixAccordion.Content
> & {
  className?: string
}

const AccordionContent = ({
  className,
  children,
  ...restProps
}: AccordionContentProps) => (
  <RadixAccordion.Content className={clsx(s.Content, className)} {...restProps}>
    <div className={s.ContentInner}>{children}</div>
  </RadixAccordion.Content>
)

/* ------------------------------------------------------------------ */
/*  Export — compound API                                              */
/* ------------------------------------------------------------------ */

type AccordionComponent = typeof AccordionRoot & {
  Item: typeof AccordionItem
  Trigger: typeof AccordionTrigger
  Content: typeof AccordionContent
}

export const Accordion = AccordionRoot as AccordionComponent
Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Content = AccordionContent
