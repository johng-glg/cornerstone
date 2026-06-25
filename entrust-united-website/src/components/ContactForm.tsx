'use client';

import { useState } from 'react';
import { contactContent } from '@content/contact';
import { site } from '@content/site';
import { cn } from '@/lib/cn';

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

const { form } = contactContent;

/**
 * Accessible contact form with client-side validation. No live backend:
 * on valid submit it composes a mailto: link (or posts to `form.formAction`
 * if you set one — e.g. a Formspree endpoint). See content/contact.ts.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function validate(data: FormData): Errors {
    const next: Errors = {};
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name) next.name = 'Please enter your name.';
    if (!email) next.email = 'Please enter your email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Please enter a valid email address.';
    if (!message) next.message = 'Please enter a message.';
    return next;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first invalid field for keyboard/AT users.
      const firstKey = Object.keys(found)[0];
      formEl.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }

    if (form.formAction) {
      formEl.action = form.formAction;
      formEl.method = 'POST';
      formEl.submit();
      return;
    }

    // mailto fallback
    const name = String(data.get('name'));
    const email = String(data.get('email'));
    const type = String(data.get('inquiryType') ?? '');
    const message = String(data.get('message'));
    const subject = encodeURIComponent(`Website inquiry: ${type || 'General'}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nInquiry type: ${type}\n\n${message}`,
    );
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  const fieldBase =
    'mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-brand-900 shadow-sm ' +
    'placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {sent && (
        <p
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          {form.successMessage}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" error={errors.name} required>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={cn(fieldBase, errors.name ? 'border-red-500' : 'border-brand-200')}
          />
        </Field>
        <Field label="Email" name="email" error={errors.email} required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(fieldBase, errors.email ? 'border-red-500' : 'border-brand-200')}
          />
        </Field>
      </div>

      <Field label="I am…" name="inquiryType">
        <select
          id="inquiryType"
          name="inquiryType"
          className={cn(fieldBase, 'border-brand-200')}
          defaultValue={form.inquiryTypes[0]}
        >
          {form.inquiryTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Message" name="message" error={errors.message} required>
        <textarea
          id="message"
          name="message"
          rows={5}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={cn(fieldBase, errors.message ? 'border-red-500' : 'border-brand-200')}
        />
      </Field>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-accent-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500"
      >
        Send message
      </button>
      <p className="text-xs text-brand-500">
        This form opens your email app to send the message. No data is stored on this site.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-brand-800">
        {label}
        {required && (
          <span className="text-accent-700" aria-hidden>
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
