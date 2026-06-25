import { contactContent } from '@content/contact';
import { site } from '@content/site';
import { pageMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/PageHero';
import { Section } from '@/components/Section';
import { ContactForm } from '@/components/ContactForm';
import { Icon } from '@/lib/icons';

export const metadata = pageMetadata(contactContent.meta);

export default function ContactPage() {
  const c = contactContent;
  const { contact } = site;
  const addr = contact.address;

  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} heading={c.hero.heading} subheading={c.hero.subheading} />

      <Section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="sr-only">
          Contact form and details
        </h2>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="font-heading text-2xl font-bold text-brand-900">{c.form.heading}</h3>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <aside className="lg:pl-4">
            <h3 className="font-heading text-2xl font-bold text-brand-900">{c.detailsHeading}</h3>
            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-3">
                <Icon name="mail" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
                <span>
                  <span className="block text-sm font-semibold text-brand-800">Email</span>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-brand-700 hover:text-accent-700 underline-offset-2 hover:underline"
                  >
                    {contact.email}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="phone" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
                <span>
                  <span className="block text-sm font-semibold text-brand-800">Phone</span>
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                    className="text-brand-700 hover:text-accent-700 underline-offset-2 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="mapPin" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
                <span>
                  <span className="block text-sm font-semibold text-brand-800">Mailing address</span>
                  <span className="not-italic text-brand-700">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                    <br />
                    {addr.city}, {addr.state} {addr.zip}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="landmark" className="mt-0.5 h-5 w-5 flex-none text-accent-600" />
                <span>
                  <span className="block text-sm font-semibold text-brand-800">Entity</span>
                  <span className="text-brand-700">
                    {site.legalEntity}
                    <br />
                    EIN: {contact.ein}
                  </span>
                </span>
              </li>
            </ul>
            <p className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-4 text-xs leading-relaxed text-brand-600">
              Public contact details above are placeholders. [CONFIRM email, phone, address, and
              EIN before launch.]
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
