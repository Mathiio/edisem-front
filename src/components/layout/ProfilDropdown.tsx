import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { UsersIcon, UserIcon, Logout, SettingsIcon, KeywordIcon, BookMarkIcon, SparklesIcon } from '@/components/ui/icons';
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
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel } from '@/config/permissions';

export const ProfilDropdown = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userData, logout, can } = useAuth();
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
  const isGlobalAdmin = userData?.role === 'global_admin';

  return (
    <Dropdown classNames={dropdownContentClassNames}>
      {/* Button trigger for opening the dropdown */}
      <DropdownTrigger>
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

              <DropdownItem key='mes-playlists' className={`${dropdownMenuItemClass} ${userData?.type === 'actant' ? '' : 'hidden'}`}>
                <Link to='/mes-playlists' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <BookMarkIcon size={15} />
                  <p className='text-base font-normal'>Mes playlists</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='adminStudent' className={`${dropdownMenuItemClass} ${canAdmin ? '' : 'hidden'}`}>
                <Link to='/users' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <UsersIcon size={16} />
                  <p className='text-base font-normal'>Utilisateurs</p>
                </Link>
              </DropdownItem>

              <DropdownItem key='adminGlobal' className={`${dropdownMenuItemClass} ${isGlobalAdmin ? '' : 'hidden'}`}>
                <Link to='/administration' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
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

              <DropdownItem key='ia' className={`${dropdownMenuItemClass} ${isGlobalAdmin ? '' : 'hidden'}`}>
                <Link to='/ia' className={`flex justify-start gap-2 hover:bg-c3 items-center w-full ${dropdownItemInnerPadding} rounded-lg transition-all ease-in-out duration-200 cursor-pointer`}>
                  <span className='inline-flex size-4 shrink-0 items-center justify-center overflow-visible' aria-hidden>
                    <SparklesIcon size={16} className='scale-[1.25] origin-center' />
                  </span>
                  <p className='text-base font-normal'>Assistant IA</p>
                </Link>
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

          </DropdownSection>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};
