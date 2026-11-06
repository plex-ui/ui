import { defineComponent, h } from 'vue';
import { TextLink } from '@plexui/vue/components/TextLink';
import s from '../AuthFields.module.css';

export const AuthLegalNotice = defineComponent({
  name: 'AuthLegalNotice',
  props: {
    termsHref: { type: String },
    privacyHref: { type: String },
  },
  setup(props) {
    const link = (href: string | undefined, label: string) => href
      ? h(TextLink, { href, target: '_blank', rel: 'noreferrer', class: s.LegalLink }, () => label)
      : h('span', { class: s.LegalLink }, label);
    return () => h('p', { class: s.LegalNotice }, [
      h('span', { class: s.LegalDocument }, [link(props.termsHref, 'Terms of Use')]),
      h('span', { class: s.LegalDocument }, [
        h('span', { 'aria-hidden': 'true', class: s.LegalSeparator }, ' | '),
        link(props.privacyHref, 'Privacy Policy'),
      ]),
    ]);
  },
});
