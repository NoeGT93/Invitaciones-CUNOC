import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './styles/variables.css';
import './styles/globals.css';
import { InvitationPage } from './pages/InvitationPage';

// El panel se descarga solo al visitar /admin: la invitación no carga su código.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const esAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <InvitationPage />
    )}
  </StrictMode>,
);
