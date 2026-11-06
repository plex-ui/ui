import { describe, expect, test } from 'vitest';
import { defineComponent, h, markRaw } from 'vue';
import { createInitialDemoState } from '../../components/docs/vue/initialDemoState';

describe('Vue preview reset data ownership', () => {
  test('editing nested data cannot change another preview or its reset defaults', () => {
    const defaults = { product: { name: 'Oak table', tags: ['Home'] }, rows: [{ title: 'First' }] };
    const first = createInitialDemoState(defaults);
    const second = createInitialDemoState(defaults);
    const product = first.product;
    if (!product || typeof product !== 'object' || !('name' in product) || !('tags' in product) || !Array.isArray(product.tags)) throw new Error('Missing product fixture');
    product.name = 'Changed';
    product.tags.push('New');
    expect(second).toEqual(defaults);
    expect(createInitialDemoState(defaults)).toEqual({ product: { name: 'Oak table', tags: ['Home'] }, rows: [{ title: 'First' }] });
  });

  test('raw components and callbacks retain identity instead of becoming mutable data copies', () => {
    const component = markRaw(defineComponent({ render: () => h('button', 'Open') }));
    const callback = () => 'Done';
    const date = new Date('2026-11-05T00:00:00Z');
    const state = createInitialDemoState({ component, callback, date });
    expect(state.component).toBe(component);
    expect(state.callback).toBe(callback);
    expect(state.date).toBe(date);
  });
});
