import { defineComponent, h, type PropType } from 'vue';
import { TransitionGroup } from '@plexui/vue/components/Transition';
import { demoNavigationTiming, hideExitingDemoScreen, showEnteringDemoScreen, type DemoNavigation } from '../demoNavigationMotion';
import s from '../DemoNavigation.module.css';

export const DemoNavigationView = defineComponent({
  name: 'DemoNavigationView',
  props: {
    navigation: { type: Object as PropType<DemoNavigation>, required: true },
    part: { type: String as PropType<'content' | 'bar'>, default: 'content' },
  },
  setup(props, { slots }) {
    return () => {
      const tag = props.part === 'bar' ? 'span' : 'div';
      // Resolve this entry now so an outgoing slot cannot read the next screen.
      const entry = h(tag, { key: props.navigation.step }, slots.default?.());
      return h(tag, {
        class: props.part === 'bar' ? s.BarViewport : s.Viewport,
        'data-demo-navigation-direction': props.navigation.direction,
      }, [h(TransitionGroup, {
        ...demoNavigationTiming, as: tag, overlay: true,
        class: props.part === 'bar' ? s.Bar : s.Content,
        onExit: hideExitingDemoScreen, onEnter: showEnteringDemoScreen,
      }, () => [entry])]);
    };
  },
});
