import { useState, createContext, useContext, ReactNode } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { ArrowIcon } from './icons';

// Context pour gérer l'état de la sidebar
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Provider
interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export const SidebarProvider = ({ children, defaultCollapsed = false }: SidebarProviderProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>{children}</SidebarContext.Provider>;
};

// Sidebar Container
interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export const Sidebar = ({ children, className = '' }: SidebarProps) => {
  const { isCollapsed } = useSidebar();

  return (
    <aside
      className={`
        h-full bg-c2/50 border-c3
        transition-all ease-in-out duration-300
        flex flex-col flex-shrink-0
        shadow-[inset_0_0px_15px_rgba(255,255,255,0.03)]
        overflow-hidden
        ${isCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[280px] min-w-[280px]'}
        ${className}
      `}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
      {children}
    </aside>
  );
};

// Sidebar Header
interface SidebarHeaderProps {
  children?: ReactNode;
  className?: string;
}

export const SidebarHeader = ({ children, className = '' }: SidebarHeaderProps) => {
  return <div className={`p-4 border-b-2 border-c3 h-[62px] flex items-center ${className}`}>{children}</div>;
};

// Sidebar Content (scrollable)
interface SidebarContentProps {
  children: ReactNode;
  className?: string;
}

export const SidebarContent = ({ children, className = '' }: SidebarContentProps) => {
  return <div className={`flex-1 overflow-y-auto p-4 ${className}`}>{children}</div>;
};

// Sidebar Footer
interface SidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export const SidebarFooter = ({ children, className = '' }: SidebarFooterProps) => {
  return <div className={`p-4 border-t-2 border-c3 h-[62px] flex items-center ${className}`}>{children}</div>;
};

// Sidebar Group
interface SidebarGroupProps {
  children: ReactNode;
  className?: string;
}

export const SidebarGroup = ({ children, className = '' }: SidebarGroupProps) => {
  return <div className={`mb-5 ${className}`}>{children}</div>;
};

// Sidebar Group Label
interface SidebarGroupLabelProps {
  children: ReactNode;
  className?: string;
}

export const SidebarGroupLabel = ({ children, className = '' }: SidebarGroupLabelProps) => {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) return null;

  return <div className={`text-xs font-medium text-c4 uppercase tracking-wider mb-2.5 px-2.5 ${className}`}>{children}</div>;
};

// Sidebar Menu
interface SidebarMenuProps {
  children: ReactNode;
  className?: string;
}

export const SidebarMenu = ({ children, className = '' }: SidebarMenuProps) => {
  return <nav className={`flex flex-col gap-2 ${className}`}>{children}</nav>;
};

// Sidebar Menu Item
interface SidebarMenuItemProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  href?: string;
  disabled?: boolean;
  suffix?: ReactNode;
}

export const SidebarMenuItem = ({ icon, label, onClick, isActive = false, className = '', href, disabled = false, suffix }: SidebarMenuItemProps) => {
  const { isCollapsed } = useSidebar();

  const content = (
    <div
      className={`
        flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg
        transition-all ease-in-out duration-200
        border-2
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
        ${
          isActive && !disabled
            ? 'bg-c3 border-c3 text-c6'
            : disabled
              ? 'border-transparent text-c4'
              : 'border-transparent text-c5 hover:bg-c3 hover:border-c3 hover:text-c6'
        }
        ${isCollapsed ? 'justify-center px-2.5' : ''}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}>
      <span className='flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center'>{icon}</span>
      {!isCollapsed && <span className='text-sm font-medium truncate flex-1'>{label}</span>}
      {!isCollapsed && suffix && <span className='flex-shrink-0 text-c4'>{suffix}</span>}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={label} placement='right' delay={0} closeDelay={0} classNames={{ content: 'bg-c2 text-c6 border-2 border-c3 px-2.5 py-1.5 rounded-lg' }}>
        {href ? (
          <a href={href} className='block'>
            {content}
          </a>
        ) : (
          content
        )}
      </Tooltip>
    );
  }

  if (href) {
    return (
      <a href={href} className='block'>
        {content}
      </a>
    );
  }

  return content;
};

// Sidebar Trigger (toggle button)
interface SidebarTriggerProps {
  className?: string;
}

export const SidebarTrigger = ({ className = '' }: SidebarTriggerProps) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <Button
      isIconOnly
      variant='light'
      onPress={toggleSidebar}
      className={`
        h-8 w-8 min-w-8 rounded-lg
        bg-c3 hover:bg-c4 text-c6
        border-2 border-c3 hover:border-c4
        transition-all ease-in-out duration-200
        ${className}
      `}>
      <ArrowIcon size={12} transform={isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'} className='transition-transform duration-300' />
    </Button>
  );
};

// Sidebar Separator
export const SidebarSeparator = ({ className = '' }: { className?: string }) => {
  const { isCollapsed } = useSidebar();
  return <div className={`h-[2px] bg-c3 my-4 ${isCollapsed ? 'mx-2.5' : 'mx-0'} rounded-full ${className}`} />;
};
