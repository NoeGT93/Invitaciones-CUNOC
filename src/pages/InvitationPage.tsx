import { useEffect, useState } from 'react';
import { Agenda } from '../components/Agenda';
import { EventDetails } from '../components/EventDetails';
import { Footer } from '../components/Footer';
import { HeroInvitation } from '../components/HeroInvitation';
import { InvitationMessage } from '../components/InvitationMessage';
import { Intro } from '../components/Intro';
import { RSVP } from '../components/RSVP';
import { TopBar } from '../components/TopBar';
import { DatosContext, useCargarInvitacion } from '../hooks/useInvitee';
import { useReveal } from '../hooks/useReveal';

export function InvitationPage() {
  const { datos, setDatos, listo } = useCargarInvitacion();
  const [abierta, setAbierta] = useState(false);
  useReveal(abierta, datos);

  // Las animaciones del hero esperan a que se levante el velo.
  useEffect(() => {
    document.documentElement.classList.toggle('is-open', abierta);
  }, [abierta]);

  return (
    <DatosContext.Provider value={datos}>
      <Intro listo={listo} onFin={() => setAbierta(true)} />
      <a className="skip" href="#programa">
        Saltar al programa
      </a>
      <TopBar />
      <main>
        <HeroInvitation />
        <section className="info" id="informacion" aria-label="Invitación e información del evento">
          <div className="container info__inner">
            <InvitationMessage />
            <EventDetails />
            <RSVP
              onCambio={(estado, nota) => setDatos((d) => (d.invitado ? { ...d, invitado: { ...d.invitado, estado, nota } } : d))}
            />
          </div>
        </section>
        <Agenda />
      </main>
      <Footer />
    </DatosContext.Provider>
  );
}
