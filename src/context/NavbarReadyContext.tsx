import { createContext, useContext } from 'react';

export interface NavbarReadyContextType {
  onNavbarReady: () => void;
}

export const NavbarReadyContext = createContext<NavbarReadyContextType | null>(null);

export function useNavbarReadyContext() {
  return useContext(NavbarReadyContext);
}
