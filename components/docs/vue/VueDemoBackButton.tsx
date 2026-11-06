import { defineComponent, h, type PropType } from 'vue';
import { NavigationButton } from '@plexui/vue/components/Button';
import { goToPreviousExample } from '../previewNavigation';

/** The phone frame handles navigation between documentation examples. */
export const VueDemoBackButton = defineComponent({
  name: 'DemoBackButton',
  props: {
    onBack: { type: Function as PropType<() => void>, default: undefined },
    label: { type: String, default: 'Back to previous example' },
  },
  setup(props) {
    return () => h(NavigationButton, {
      action: 'back',
      'aria-label': props.label,
      onClick: (event: MouseEvent) => {
        if (props.onBack) { props.onBack(); return; }
        const previewKey = new URLSearchParams(window.location.search).get('key');
        if (previewKey && window.parent !== window) window.parent.postMessage({ previewKey, previewBack: true }, window.location.origin);
        else goToPreviousExample(event.currentTarget instanceof Element ? event.currentTarget : null);
      },
    });
  },
});
