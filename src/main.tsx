import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './styles/variables.css';
import './styles/globals.css';
import { InvitationPage } from './pages/InvitationPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InvitationPage />
  </StrictMode>,
);
