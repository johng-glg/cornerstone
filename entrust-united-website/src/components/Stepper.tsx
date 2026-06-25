import type { Step } from '@content/types';

/** Vertical numbered stepper with a connecting line. */
export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative space-y-8">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-5">
          {/* Connector line (decorative) */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-5 top-12 h-[calc(100%-1rem)] w-px bg-brand-200"
            />
          )}
          <span
            aria-hidden
            className="relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-800 font-heading text-base font-bold text-white"
          >
            {i + 1}
          </span>
          <div className="pt-1">
            <h3 className="font-heading text-xl font-semibold text-brand-900">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 leading-relaxed text-brand-700">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
