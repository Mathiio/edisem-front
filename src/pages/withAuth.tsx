import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertModal } from '@/components/ui/AlertModal';
import { hasPermission, type Permission } from '@/config/permissions';
import type { UserData } from '@/hooks/useAuth';

type AuthOptions = {
  /** Permission required to access this page ('admin', 'create', 'view', or 'any' for authenticated-only). */
  requiredPermission?: Permission | 'any';
  /** Omeka role required (e.g. global_admin for /administration). */
  requiredOmekaRole?: 'global_admin';
  /** @deprecated Use requiredPermission instead. Kept for backward compat. */
  requiredRole?: 'actant' | 'student' | 'any';
};

function isUserAuthorized(user: UserData | null, options: AuthOptions): boolean {
  if (!user) return false;

  if (options.requiredOmekaRole) {
    return user.role === options.requiredOmekaRole;
  }

  // New permission-based check takes precedence
  if (options.requiredPermission && options.requiredPermission !== 'any') {
    return hasPermission(user.role, user.type, options.requiredPermission);
  }

  // Legacy role-based check (backward compat)
  if (options.requiredRole && options.requiredRole !== 'any') {
    const userRole = user.type === 'actant' ? 'actant' : 'student';
    return options.requiredRole === userRole;
  }

  return true;
}

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: AuthOptions = { requiredPermission: 'any' },
) {
  return function WithAuth(props: P) {
    const navigate = useNavigate();

    const user = React.useMemo<UserData | null>(() => {
      const userString = localStorage.getItem('user');
      if (!userString || userString === 'null') return null;
      try { return JSON.parse(userString); } catch { return null; }
    }, []);

    const [showError, setShowError] = React.useState(false);

    const isAuthorized = React.useMemo(() => isUserAuthorized(user, options), [user]);

    useEffect(() => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!isAuthorized) {
        setShowError(true);
      }
    }, [user, isAuthorized, navigate]);

    const handleConfirm = () => {
      setShowError(false);
      navigate('/');
    };

    if (!isAuthorized && user) {
      return (
        <div className="min-h-screen bg-c1 flex items-center justify-center">
          <AlertModal
            isOpen={showError}
            onClose={handleConfirm}
            title="Accès refusé"
            description="Vous n'avez pas les droits nécessaires pour accéder à cette page."
            type="forbidden"
            confirmLabel="Retour à l'accueil"
            onConfirm={handleConfirm}
          />
        </div>
      );
    }

    if (!user) return null;

    return <WrappedComponent {...props} />;
  };
}
