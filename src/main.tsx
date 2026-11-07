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
const AccesoApp = lazy(() => import('./acceso/AccesoApp'));
const ruta = location.pathname.replace(/\/$/, '');
const esAcceso = ruta === '/acceso';
const esAdmin = ruta === '/admin' || ruta.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esAcceso ? (
      <Suspense fallback={null}>
        <AccesoApp />
      </Suspense>
    ) : esAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <InvitationPage />
    )}
  </StrictMode>,
);
