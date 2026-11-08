import { defineComponent, h, type PropType } from 'vue';
import { TransitionGroup } from '@plexui/vue/components/Transition';
import { demoNavigationTiming, hideExitingDemoScreen, showEnteringDemoScreen, type DemoNavigation } from '../demoNavigationMotion';
import s from '../DemoNavigation.module.css';

export const DemoNavigationView = defineComponent({
  name: 'DemoNavigationView',
  props: {
    navigation: { type: Object as PropType<DemoNavigation>, required: true },
    part: { type: String as PropType<'content' | 'bar'>, default: 'content' },
    /** The bar control this step shows ('back', 'close'): one the step before showed too stays in place. */
    control: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    let shown = { step: props.navigation.step, control: props.control, same: false };
    return () => {
      const tag = props.part === 'bar' ? 'span' : 'div';
      if (shown.step !== props.navigation.step) {
        shown = { step: props.navigation.step, control: props.control, same: props.control !== undefined && props.control === shown.control };
      }
      // Resolve this entry now so an outgoing slot cannot read the next screen.
      const entry = h(tag, { key: props.navigation.step }, slots.default?.());
      return h(tag, {
        class: props.part === 'bar' ? s.BarViewport : s.Viewport,
        'data-demo-navigation-direction': props.navigation.direction,
        'data-demo-navigation-same': shown.same ? '' : undefined,
      }, [h(TransitionGroup, {
        ...demoNavigationTiming, as: tag, overlay: true,
        class: props.part === 'bar' ? s.Bar : s.Content,
        onExit: hideExitingDemoScreen, onEnter: showEnteringDemoScreen,
      }, () => [entry])]);
    };
  },
});
