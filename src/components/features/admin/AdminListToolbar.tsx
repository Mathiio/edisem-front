import React from 'react';
import { Input, Select, SelectItem, Pagination } from '@/theme/components';
import { SearchIcon } from '@/components/ui/icons';
import { adminPaginationClassNames, type AdminSortOrder } from '@/components/features/admin/adminListConfig';

interface AdminListToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  totalCount: number;
  totalLabel?: string;
  sortOrder: AdminSortOrder;
  onSortChange: (order: AdminSortOrder) => void;
  showSort?: boolean;
  filters?: React.ReactNode;
}

export const AdminListToolbar: React.FC<AdminListToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  sortOrder,
  onSortChange,
  showSort = true,
  filters,
}) => {
  return (
    <div className='flex flex-col gap-3'>

      <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
        <Input
          aria-label='Rechercher'
          placeholder={searchPlaceholder}
          value={searchQuery}
          onValueChange={onSearchChange}
          startContent={<SearchIcon size={16} className='text-c5 shrink-0' />}
          className='flex-1 min-w-0'
          classNames={{ inputWrapper: '!min-h-[44px]' }}
        />

        {filters}

        {showSort && (
          <Select
            size='sm'
            selectedKeys={[sortOrder]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key === 'asc' || key === 'desc') onSortChange(key);
            }}
            className='w-full lg:w-44'
            aria-label='Trier la liste'>
            <SelectItem key='asc' className='text-c6 hover:bg-c3'>
              A → Z
            </SelectItem>
            <SelectItem key='desc' className='text-c6 hover:bg-c3'>
              Z → A
            </SelectItem>
          </Select>
        )}
      </div>
    </div>
  );
};

interface AdminListPaginationProps {
  totalCount: number;
  pageSize: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const AdminListPagination: React.FC<AdminListPaginationProps> = ({
  totalCount,
  pageSize,
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalCount <= pageSize) return null;

  return (
    <div className='flex justify-end pt-1'>
      <Pagination
        total={totalPages}
        page={page}
        onChange={onPageChange}
        showControls
        radius='lg'
        classNames={adminPaginationClassNames}
      />
    </div>
  );
};

interface AdminListEmptyStateProps {
  message?: string;
}

export const AdminListEmptyState: React.FC<AdminListEmptyStateProps> = ({
  message = 'Aucun élément ne correspond à votre recherche.',
}) => (
  <div className='border-2 border-dashed border-c3 rounded-xl py-12 text-center text-c4 text-sm'>{message}</div>
);

export const adminTableClassNames = {
  wrapper: 'bg-transparent shadow-none rounded-xl',
  th: 'bg-c3 text-c6 h-12 first:rounded-l-8 last:rounded-r-8',
  td: 'text-c6',
};

/** Largeur fixe partagée en-tête + cellules — le titre débute au même endroit que les boutons */
export const adminActionsWrapperClass =
  'ml-auto flex items-center justify-start gap-1.5 shrink-0 w-[11rem]';
