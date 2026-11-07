import { Chapter } from '~/components/home/Chapter';
import { ContactForm } from '~/components/contact/ContactForm';
import { CONTACT_BAND } from '~/content/people';

// 96px of room under the form. The chapter frame trims its bottom padding from 900px, so the
// override repeats there.
const BAND = 'pb-[96px] min-[900px]:pb-[96px]';

/** Chapter 13: the invitation and the message form. The links live in the footer. */
export function ContactBand() {
  return (
    <Chapter
      id={CONTACT_BAND.id}
      n={CONTACT_BAND.n}
      title={CONTACT_BAND.title}
      overline={CONTACT_BAND.overline}
      heading={CONTACT_BAND.heading}
      className={BAND}
      figure={
        <div className="pp-cform order-2 min-[900px]:self-center">
          <ContactForm />
        </div>
      }
    >
      <p>{CONTACT_BAND.line}</p>
    </Chapter>
  );
}
