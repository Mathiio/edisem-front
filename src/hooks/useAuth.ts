import { useState, useEffect, useCallback, useRef } from 'react';
import { hasPermission, type Permission } from '@/config/permissions';
import { getCurrentOmekaUserId, syncOmekaUserIdStorage } from '@/lib/currentOmekaUser';

export interface UserData {
  id: number;
  firstname?: string;
  lastname?: string;
  picture?: string;
  type?: 'actant' | 'student' | string;
  role?: string;
  omekaUserId?: number | null;
  email?: string;
}

/**
 * Decode the payload section of a JWT without verifying signature.
 * Used client-side only to read the `exp` claim.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
}

/** Custom event dispatched when a 401 is detected from the backend. */
export const SESSION_EXPIRED_EVENT = 'edisem:session-expired';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStorage = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('omekaUserId');
    localStorage.removeItem('token');
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setIsAuthenticated(false);
    setUserData(null);
    setSessionExpired(false);
  }, [clearStorage]);

  const scheduleExpiryCheck = useCallback((token: string) => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);

    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      clearStorage();
      setIsAuthenticated(false);
      setUserData(null);
      setSessionExpired(true);
      return;
    }

    expiryTimerRef.current = setTimeout(() => {
      clearStorage();
      setIsAuthenticated(false);
      setUserData(null);
      setSessionExpired(true);
    }, msUntilExpiry);
  }, [clearStorage]);

  const checkAuth = useCallback(() => {
    try {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (token && isTokenExpired(token)) {
        clearStorage();
        setIsAuthenticated(false);
        setUserData(null);
        setSessionExpired(true);
        setIsLoading(false);
        return;
      }

      const authenticated = !!(user && user !== 'null' && token);
      setIsAuthenticated(authenticated);

      if (user && user !== 'null') {
        try {
          const parsed = JSON.parse(user) as UserData;
          setUserData(parsed);
          if (getCurrentOmekaUserId(parsed) != null) {
            syncOmekaUserIdStorage();
          }
        } catch {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      if (authenticated && token) {
        scheduleExpiryCheck(token);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      setIsAuthenticated(false);
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  }, [clearStorage, scheduleExpiryCheck]);

  const login = useCallback((user: UserData, token: string) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userId', String(user.id));
    localStorage.setItem('userType', user.type || '');
    localStorage.setItem('token', token);

    syncOmekaUserIdStorage();

    setIsAuthenticated(true);
    setUserData(user);
    setSessionExpired(false);
    scheduleExpiryCheck(token);
  }, [scheduleExpiryCheck]);

  /**
   * Convenience helper: checks a permission against the current user.
   */
  const can = useCallback(
    (permission: Permission) => hasPermission(userData?.role, userData?.type, permission),
    [userData],
  );

  useEffect(() => {
    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        checkAuth();
      }
    };

    const handleSessionExpired = () => {
      clearStorage();
      setIsAuthenticated(false);
      setUserData(null);
      setSessionExpired(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [checkAuth, clearStorage]);

  return {
    isAuthenticated,
    userData,
    isLoading,
    sessionExpired,
    login,
    logout,
    checkAuth,
    can,
  };
};