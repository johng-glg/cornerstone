import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/Button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-heading text-6xl font-bold text-accent-500">404</p>
      <h1 className="mt-4 font-heading text-3xl font-bold text-brand-900">Page not found</h1>
      <p className="mt-3 max-w-md text-brand-700">
        Sorry — we couldn’t find that page. It may have moved, or the link may be incorrect.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" variant="primary">
          Back to home
        </ButtonLink>
        <ButtonLink href="/contact" variant="ghost">
          Contact us
        </ButtonLink>
      </div>
    </Container>
  );
}
