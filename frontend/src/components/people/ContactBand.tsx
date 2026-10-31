import { ContactForm } from '~/components/contact/ContactForm';
import { CONTACT_BAND, GITHUB_URL, LINKEDIN_URL } from '~/content/people';
import { resumeInfo, type ResumeInfo } from '~/lib/resume';
import { PeopleChapter } from './PeopleChapter';
import { ResumeLink } from './ResumeLink';

function OutsideLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="pp-tl" href={href} target="_blank" rel="noopener">
      {children} <span className="sr">(opens in a new tab)</span>
    </a>
  );
}

/** Chapter 12: the invitation, three outside links and the message form. */
export function ContactBand({ resume = resumeInfo }: { resume?: ResumeInfo }) {
  return (
    <PeopleChapter
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
        <ResumeLink info={resume} className="pp-tl" />
      </div>
    </PeopleChapter>
  );
}
