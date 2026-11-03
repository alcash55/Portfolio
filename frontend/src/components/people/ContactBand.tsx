import { Chapter } from '~/components/home/Chapter';
import { Fig } from '~/components/home/Fig';
import { ContactForm } from '~/components/contact/ContactForm';
import { CONTACT_BAND, GITHUB_URL, LINKEDIN_URL } from '~/content/people';
import { resumeInfo, type ResumeInfo } from '~/lib/resume';
import { ResumeLink } from './ResumeLink';
import './people.css';

function OutsideLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="pp-tl" href={href} target="_blank" rel="noopener">
      {children} <span className="sr">(opens in a new tab)</span>
    </a>
  );
}

/** Chapter 13: the invitation, three outside links and the message form. */
export function ContactBand({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  const { fig } = CONTACT_BAND;
  return (
    <Chapter
      id={CONTACT_BAND.id}
      n={CONTACT_BAND.n}
      title={CONTACT_BAND.title}
      overline={CONTACT_BAND.overline}
      heading={CONTACT_BAND.heading}
      className="pp-contact"
      figure={
        <div className="pp-cform">
          <ContactForm />
        </div>
      }
    >
      <p>{CONTACT_BAND.line}</p>
      <div className="pp-tlinks">
        <OutsideLink href={LINKEDIN_URL}>LinkedIn</OutsideLink>
        <OutsideLink href={GITHUB_URL}>GitHub</OutsideLink>
        <ResumeLink info={resume} location="contact_band" className="pp-tl" />
      </div>
      <div className="pp-dogs">
        <Fig n={fig.n} label={fig.label} caption={fig.caption}>
          <img src={fig.src} width={fig.width} height={fig.height} alt={fig.alt} loading="lazy" />
        </Fig>
      </div>
    </Chapter>
  );
}
