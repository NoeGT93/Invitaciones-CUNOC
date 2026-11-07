import { Agenda } from '../components/Agenda';
import { EventDetails } from '../components/EventDetails';
import { Footer } from '../components/Footer';
import { HeroInvitation } from '../components/HeroInvitation';
import { InvitationMessage } from '../components/InvitationMessage';
import { TopBar } from '../components/TopBar';
import { useInvitee } from '../hooks/useInvitee';
import { useReveal } from '../hooks/useReveal';

export function InvitationPage() {
  const { invitado, maestrante } = useInvitee();
  useReveal();
  return (
    <>
      <a className="skip" href="#programa">
        Saltar al programa
      </a>
      <TopBar />
      <main>
        <HeroInvitation invitado={invitado} />
        <section className="info" id="informacion" aria-label="Invitación e información del evento">
          <div className="container info__inner">
            <InvitationMessage invitado={invitado} />
            <EventDetails />
          </div>
        </section>
        <Agenda />
      </main>
      <Footer maestrante={maestrante} />
    </>
  );
}
