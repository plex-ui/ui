'use client';

import { Children, createContext, useContext, type ReactNode } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import s from './AuthFields.module.css';

const AuthFieldsContext = createContext(false);

export function useAuthFields(): boolean {
    return useContext(AuthFieldsContext);
}

/** One mobile surface for related inputs. Desktop keeps the caller's stack. */
export function AuthFields({
    children,
    className,
    footer,
}: {
    children: ReactNode;
    className?: string;
    footer?: ReactNode;
}): ReactNode {
    const wide = useBreakpoint('md');
    if (wide) return className ? <div className={className}>{children}</div> : <>{children}</>;
    return (
        <AuthFieldsContext.Provider value>
            <FieldGroup className={s.Group} bodyClassName={s.Body} footer={footer} data-auth-fields>
                {Children.map(children, (child) =>
                    child == null ? null : <div data-row>{child}</div>,
                )}
            </FieldGroup>
        </AuthFieldsContext.Provider>
    );
}
