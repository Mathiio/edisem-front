export const ADMIN_LIST_PAGE_SIZE = 10;

export const adminPaginationClassNames = {
  wrapper: 'gap-1.5',
  item: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !shadow-none !cursor-pointer data-[hover=true]:!bg-c3',
  cursor:
    '!min-w-9 !w-9 !h-9 !rounded-lg !bg-action !border-2 !border-c3 !text-selected !font-medium !shadow-none !cursor-pointer',
  prev: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
  next: '!min-w-9 !w-9 !h-9 !rounded-lg !bg-c2 !border-2 !border-c3 !text-c6 !cursor-pointer data-[disabled=true]:!opacity-40 data-[disabled=true]:!cursor-default',
};

export type AdminSortOrder = 'asc' | 'desc';

export function sortByStringField(
  a: string | null | undefined,
  b: string | null | undefined,
  order: AdminSortOrder,
): number {
  const cmp = (a || '').localeCompare(b || '', 'fr', { sensitivity: 'base' });
  return order === 'asc' ? cmp : -cmp;
}

export function matchesAdminSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}
