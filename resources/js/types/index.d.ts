export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    roles: string[];
    permissions: string[];
    isSuperAdmin: boolean;
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    status: string;
}

export interface Store {
    id: string;
    code: string;
    name: string;
    taxPercentage?: string | number;
}

export interface Auth {
    user: User | null;
    tenant: Tenant | null;
    activeStore: Store | null;
    availableStores: Store[];
}

export interface FlashMessages {
    success?: string;
    error?: string;
    info?: string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: Auth;
    appName: string;
    flash: FlashMessages;
    errors: Record<string, string>;
};

