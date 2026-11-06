/** Mutable demo data belongs to one preview; components and class instances keep identity. */
export function copyInitialDemoValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copyInitialDemoValue);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && !('__v_skip' in value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyInitialDemoValue(item)]));
  }
  return value;
}

export function createInitialDemoState(state: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, copyInitialDemoValue(value)]));
}
