# SelectControl — Designer Descriptions

## Overview

SelectControl is a flexible, customizable component that serves as the trigger element for dropdown menus and select interfaces. Unlike a complete select component, SelectControl provides only the visual control surface, allowing you to pair it with any floating UI solution like Menu or Popover. This separation gives you full control over the dropdown behavior while maintaining consistent visual styling.

The component handles all visual states, sizing, and interactive feedback automatically. It supports icons, clear actions, loading states, and various styling variants to match your design system needs.

## Variants

SelectControl offers three visual variants that align with your design system's input and button styles. The `soft` variant provides a subtle background treatment, `outline` uses a border-based approach for clear definition, and `ghost` offers a minimal appearance that blends with surrounding content.

These variants share similarities with Button component styles but are specifically tuned for select controls, with subtle differences in how they handle focus states and interactions compared to standard input fields.

## Sizing & Roundness

The component supports nine size options ranging from `3xs` (22px) to `3xl` (48px), with each size automatically adjusting font size, spacing, icon placement, and internal gutters. The sizing system ensures visual consistency across all interactive elements within the control.

Use the `pill` prop to create fully rounded controls. When enabled, the component automatically applies additional horizontal padding and extends the pill shape to the clear action button, creating a cohesive rounded appearance throughout the control.

## Selected State

The `selected` prop controls the visual distinction between placeholder and selected states. When `selected` is false, the control displays placeholder styling (typically lighter text color). When true, it shows the active selected state styling.

Note that this prop only affects visual presentation—the actual content displayed inside the control is managed separately by your implementation, giving you flexibility in how selected values are rendered.

## Start Icon

Icons can be placed at the beginning of the control using the `StartIcon` prop. The component automatically handles icon sizing, spacing from text, and color application based on the current variant and state.

Icons are particularly useful for providing visual context about the type of selection being made, such as calendar icons for date pickers or user icons for role selection.

## Dropdown Icon

Control the appearance of the dropdown indicator with the `dropdownIconType` prop. Choose between `dropdown` (default), `chevronDown`, or `none` to match your design language or hide the indicator entirely.

The dropdown icon automatically hides during loading states to reduce visual clutter and is positioned at the far right of the control, after any clear action button.

## Clearable

Enable a clear action by providing an `onClearClick` callback function. When a value is selected, a small clear button appears on the right side of the control, allowing users to quickly reset their selection.

The clear button automatically adapts its styling based on whether a dropdown icon is present, using a ghost variant when both are visible and a solid variant when it's the only indicator. The button also respects the `pill` prop for consistent rounding.

## Loading State

During loading, the component displays a loading indicator and automatically hides both the dropdown icon and clear action to prevent interaction conflicts. The control becomes non-interactive by default to prevent user actions during data fetching.

You can override the interaction blocking behavior if needed, or combine `loading` with `disabled` to add visual disablement styling while maintaining the loading indicator.

## Invalid State

Use the `invalid` prop to visually indicate that the current selection is invalid or doesn't meet validation requirements. The component applies error styling that aligns with your design system's error treatment patterns.

This state is particularly useful in forms where selections must meet specific criteria, providing immediate visual feedback before form submission.

## Disabled State

The `disabled` prop both visually and functionally disables the control, preventing all interactions and applying appropriate disabled styling. This ensures accessibility compliance by properly communicating the disabled state to assistive technologies.

Use this state when a selection is not applicable in the current context, such as when dependent on another form field or when permissions restrict certain options.

## Block Layout

Enable full-width controls with the `block` prop. When set, the control expands to fill 100% of its container width, making it ideal for form layouts where consistent width is important.

This is particularly useful in narrow containers or when you want the control to match the width of other form elements like text inputs.

## Optical Alignment

Use `opticallyAlign` to fine-tune the visual positioning of the control relative to surrounding content. This prop applies negative margins using the current gutter values to compensate for optical illusions that can make elements appear misaligned.

Choose `"start"` to align the left edge or `"end"` to align the right edge. This is especially useful when placing controls next to text or other elements where pixel-perfect alignment might look slightly off due to visual weight differences.
