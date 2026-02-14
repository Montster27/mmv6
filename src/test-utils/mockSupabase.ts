import { vi } from "vitest";

/**
 * Creates a chainable Supabase mock builder that supports all common operations.
 * This is the single source of truth for Supabase mocking across all tests.
 */
export function createMockSupabaseBuilder() {
    let selectResponses: Array<{ data: unknown; error: unknown }> = [];
    let maybeSingleResponses: Array<{ data: unknown; error: unknown }> = [];
    const insertPayloads: Array<{ table: string; payload: unknown }> = [];
    const updatePayloads: Array<{ table: string; payload: unknown }> = [];
    const upsertPayloads: Array<{ table: string; payload: unknown }> = [];
    const deletePayloads: Array<{ table: string }> = [];

    const builder: Record<string, unknown> = {
        table: "",
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        gt: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        lt: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        like: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        is: vi.fn(() => builder),
        in: vi.fn(() => builder),
        contains: vi.fn(() => builder),
        containedBy: vi.fn(() => builder),
        filter: vi.fn(() => builder),
        not: vi.fn(() => builder),
        or: vi.fn(() => builder),
        and: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        range: vi.fn(() => builder),
        single: vi.fn(async () => maybeSingleResponses.shift() ?? { data: null, error: null }),
        maybeSingle: vi.fn(async () => maybeSingleResponses.shift() ?? { data: null, error: null }),
        insert: vi.fn((payload: unknown) => {
            insertPayloads.push({ table: builder.table as string, payload });
            return builder;
        }),
        update: vi.fn((payload: unknown) => {
            updatePayloads.push({ table: builder.table as string, payload });
            return builder;
        }),
        upsert: vi.fn((payload: unknown) => {
            upsertPayloads.push({ table: builder.table as string, payload });
            return builder;
        }),
        delete: vi.fn(() => {
            deletePayloads.push({ table: builder.table as string });
            return builder;
        }),
        // Make the builder thenable for select operations
        then: (resolve: (value: { data: unknown; error: unknown }) => void) =>
            Promise.resolve(selectResponses.shift() ?? { data: [], error: null }).then(resolve),
    };

    const supabase = {
        from: vi.fn((table: string) => {
            builder.table = table;
            return builder;
        }),
        auth: {
            getSession: vi.fn(async () => ({
                data: { session: { access_token: "test-token", user: { id: "test-user" } } },
                error: null,
            })),
            getUser: vi.fn(async () => ({
                data: { user: { id: "test-user", email: "test@example.com" } },
                error: null,
            })),
            signIn: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(),
                download: vi.fn(),
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com/file" } })),
            })),
        },
        rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    return {
        supabase,
        builder,
        // Response setters
        setSelectResponses: (responses: Array<{ data: unknown; error: unknown }>) => {
            selectResponses = [...responses];
        },
        setMaybeSingleResponses: (responses: Array<{ data: unknown; error: unknown }>) => {
            maybeSingleResponses = [...responses];
        },
        // Payload getters
        getInsertPayloads: () => insertPayloads,
        getUpdatePayloads: () => updatePayloads,
        getUpsertPayloads: () => upsertPayloads,
        getDeletePayloads: () => deletePayloads,
        // Reset all state
        reset: () => {
            selectResponses = [];
            maybeSingleResponses = [];
            insertPayloads.length = 0;
            updatePayloads.length = 0;
            upsertPayloads.length = 0;
            deletePayloads.length = 0;
        },
    };
}

/**
 * Type for the mock state returned by createMockSupabaseBuilder
 */
export type MockSupabaseState = ReturnType<typeof createMockSupabaseBuilder>;
