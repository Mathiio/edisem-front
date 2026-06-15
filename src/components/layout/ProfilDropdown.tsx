import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { UserIcon, Logout, SunIcon, MoonIcon, SettingsIcon, KeywordIcon, BookMarkIcon } from '@/components/ui/icons';
import { User } from '@heroui/react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  dropdownContentClassNames,
  dropdownTriggerButtonClass,
  dropdownMenuClassNames,
  dropdownMenuItemClass,
  dropdownItemInnerPadding,
} from '@/theme/components/dropdown';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel } from '@/config/permissions';

export const ProfilDropdown = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userData, logout, can } = useAuth();
  const { isDark, toggleThemeMode } = useThemeMode();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const userFirstName = userData?.firstname;
  const userLastName = userData?.lastname;

  const displayName = useMemo(() => {
    if (userFirstName && userLastName)
      return `${userFirstName} ${userLastName.charAt(0)}.`;
    return userFirstName || userLastName || 'Profil';
  }, [userFirstName, userLastName]);

  const fullName = useMemo(() => {
    if (userFirstName && userLastName)
      return `${userFirstName} ${userLastName}`;
    return userFirstName || userLastName || 'Utilisateur';
  }, [userFirstName, userLastName]);

  const roleLabel = useMemo(
    () => getRoleLabel(userData?.role, userData?.type),
    [userData?.role, userData?.type],
  );

  const canAdmin = can('admin');

  return (
    <Dropdown classNames={dropdownContentClassNames}>
      {/* Button trigger for opening the dropdown */}
      <DropdownTrigger className='p-3'>
        <div className={dropdownTriggerButtonClass}>
          {/* User avatar if authenticated, otherwise fallback icon */}
          {isAuthenticated && userData?.picture ? (
            <img src={userData.picture} alt='Avatar' className='w-6 h-6 rounded-md object-cover' />
          ) : (
            <UserIcon size={16} className='text-c6' />
          )}
          {/* Display name or "Profil" */}
          <span className='text-base font-normal text-c6'>{isAuthenticated ? displayName : 'Profil'}</span>
        </div>
      </DropdownTrigger>

      {/* Main dropdown menu content */}
      <DropdownMenu aria-label='User menu' className='p-2' classNames={dropdownMenuClassNames}>
        {isAuthenticated ? (
          // When the user is authenticated
          <>
            {/* Top section with user profile info (readonly) */}
            <DropdownSection showDivider>
              <DropdownItem isReadOnly key='profile' className='opacity-100 p-0 cursor-default'>
                <div className='flex gap-2 items-center w-full bg-c2 rounded-lg p-1'>
                  <User
                    name={fullName}
                    description={roleLabel}
                    classNames={{
                      name: 'text-c6',
                      description: 'text-c5',
                    }}
                    avatarProps={{
                      src: userData?.picture || undefined,
                      fallback: <UserIcon className='text-c6' size={16} />,
                      size: 'sm',
                      radius: 'sm',
                    }}
                  />
                </div>
              </DropdownItem>
            </DropdownSection>

            <DropdownSection className='mb-0'>
              <DropdownItem key='mon-espace' className={dropdownMenuItemClass}>
                <Link to={userData?.type === 'actant' ? '/mon-espace-4' : '/mon-espace'} className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <UserIcon size={16} />
                  <p className='text-base font-normal'>Mon espace</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='liste-de-lecture' className={`${dropdownMenuItemClass} ${userData?.type === 'actant' ? '' : 'hidden'}`}>
                <Link to='/liste-de-lecture' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <BookMarkIcon size={15} />
                  <p className='text-base font-normal'>Liste de lecture</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='adminStudent' className={`${dropdownMenuItemClass} ${canAdmin ? '' : 'hidden'}`}>
                <Link to='/admin' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <SettingsIcon size={16} />
                  <p className='text-base font-normal'>Administration</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='mots-cles' className={`${dropdownMenuItemClass} ${canAdmin ? '' : 'hidden'}`}>
                <Link to='/mots-cles' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <KeywordIcon size={16} />
                  <p className='text-base font-normal'>Mots-clés</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='theme' className={dropdownMenuItemClass}>
                <button onClick={toggleThemeMode} className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                  <span className='text-base font-normal'>{isDark ? 'Thème clair' : 'Thème sombre'}</span>
                </button>
              </DropdownItem>

              <DropdownItem key='logout' className={dropdownMenuItemClass}>
                <button onClick={handleLogout} className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <Logout size={16} />
                  <p className='text-base font-normal'>Se déconnecter</p>
                </button>
              </DropdownItem>
            </DropdownSection>
          </>
        ) : (
          // When the user is not authenticated
          <DropdownSection className='mb-0'>
            {/* Link to Login page */}
            <DropdownItem key='login' className={dropdownMenuItemClass}>
              <Link to='/login' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                <UserIcon size={16} />
                <p className='text-base font-normal'>Connexion</p>
              </Link>
            </DropdownItem>

            {/* Theme toggle for unauthenticated users */}
            <DropdownItem key='theme' className={dropdownMenuItemClass}>
              <button onClick={toggleThemeMode} className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                <span className='text-base font-normal'>{isDark ? 'Thème clair' : 'Thème sombre'}</span>
              </button>
            </DropdownItem>
          </DropdownSection>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};
