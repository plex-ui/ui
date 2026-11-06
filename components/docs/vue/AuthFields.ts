import {
    Comment,
    Fragment,
    Text,
    defineComponent,
    h,
    inject,
    provide,
    type InjectionKey,
} from 'vue';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import s from '../AuthFields.module.css';

export const authMobileKey: InjectionKey<() => boolean> = Symbol('auth-mobile');
export const authFieldsKey: InjectionKey<() => boolean> = Symbol('auth-fields');

export const AuthFields = defineComponent({
    name: 'AuthFields',
    inheritAttrs: false,
    props: { mobile: { type: Boolean, default: undefined } },
    setup(props, { attrs, slots }) {
        const shellMobile = inject(authMobileKey, () => false);
        const mobile = () => props.mobile ?? shellMobile();
        provide(authFieldsKey, mobile);
        provide(authMobileKey, mobile);
        return () =>
            mobile()
                ? h(
                      FieldGroup,
                      { class: s.Group, bodyClass: s.Body, 'data-auth-fields': '' },
                      {
                          ...slots,
                          default: () =>
                              slots
                                  .default?.()
                                  .filter(
                                      (child) =>
                                          child.type !== Comment &&
                                          (child.type !== Text || String(child.children).trim()),
                                  )
                                  .map((child) =>
                                      h('div', { 'data-row': '', key: child.key ?? undefined }, [
                                          child,
                                      ]),
                                  ),
                      },
                  )
                : attrs.class
                  ? h('div', attrs, slots.default?.())
                  : h(Fragment, slots.default?.());
    },
});
