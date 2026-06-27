import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { HeroUIProvider } from "@heroui/react";
import './main.css';

// Composant racine qui accède à useNavigate() (disponible car rendu dans le data router)
function AppWithProviders() {
  const navigate = useNavigate();
  return (
    <HeroUIProvider navigate={navigate} labelPlacement="outside-top">
      <App />
    </HeroUIProvider>
  );
}

// createBrowserRouter active les fonctionnalités "data router" (useBlocker, loaders, etc.)
// Le path '*' laisse App.tsx gérer tout le routage via son propre <Routes>.
const router = createBrowserRouter([{ path: '*', element: <AppWithProviders /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);