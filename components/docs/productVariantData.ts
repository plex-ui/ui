export type ProductVariant = { id: string; name: string };

/** Local product choices, not inventory records or generated SKU combinations. */
export function variantNameError(value: ProductVariant[], name: string, editingId: string | null) {
  if (!name.trim()) return 'Enter a variant name.';
  if (editingId && !value.some((variant) => variant.id === editingId)) return 'This variant is no longer available.';
  if (value.some((variant) => variant.id !== editingId && variant.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    return 'A variant with this name already exists.';
  }
  return '';
}

export function nextVariantId(value: ProductVariant[]) {
  let index = 1;
  while (value.some((variant) => variant.id === `variant-${index}`)) index++;
  return `variant-${index}`;
}
