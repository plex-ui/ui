import { defineComponent, h } from 'vue';
import { splitPhoneCountryName } from '../phoneCountryName';
import s from '../CountryLabel.module.css';

export const PhoneCountryLabel = defineComponent({
  name: 'PhoneCountryLabel',
  props: {
    label: { type: String, required: true },
    dialCode: String,
  },
  setup(props) {
    return () => {
      const { start, end } = splitPhoneCountryName(props.label);
      return h('span', { class: s.TriggerLabel }, [
        h('span', { class: 'sr-only' }, `${props.label}${props.dialCode ? ` (${props.dialCode})` : ''}`),
        h('span', { class: s.TriggerName, 'aria-hidden': 'true' }, [
          h('span', { class: s.TriggerStart }, start),
          h('span', { class: s.TriggerEnd }, end),
        ]),
        props.dialCode ? h('span', { class: s.TriggerDialCode, 'aria-hidden': 'true' }, ` (${props.dialCode})`) : null,
      ]);
    };
  },
});
