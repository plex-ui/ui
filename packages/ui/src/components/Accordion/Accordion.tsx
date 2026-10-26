"use client"

import clsx from "clsx"
import { type ComponentProps, type Ref } from "react"
import { Accordion as RadixAccordion } from "radix-ui"
import { ChevronDownMd } from "../Icon"
import s from "@plexui/styles/components/Accordion/Accordion.module.css"

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type AccordionProps = ComponentProps<typeof RadixAccordion.Root> & {
  className?: string
}

const AccordionRoot = ({
  className,
  ...restProps
}: AccordionProps) => (
  <RadixAccordion.Root className={clsx(s.Root, className)} {...restProps} />
)

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
