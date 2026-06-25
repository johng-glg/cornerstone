/**
 * Inline SVG illustrating the FBO segregation model: consumer contributions
 * flow into segregated custodial accounts held for the consumer's benefit,
 * kept separate from the organization's operating funds.
 *
 * Fully responsive (viewBox-scaled) and labelled for assistive technology.
 */
export function FboDiagram({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <svg
        viewBox="0 0 760 320"
        className="h-auto w-full"
        role="img"
        aria-labelledby="fbo-title fbo-desc"
      >
        <title id="fbo-title">FBO custodial fund segregation</title>
        <desc id="fbo-desc">
          Consumer contributions flow into a segregated custodial account held for the
          consumer’s benefit. That custodial account is kept entirely separate from Entrust
          United’s operating funds, which are used only for administration.
        </desc>

        <defs>
          <marker
            id="fbo-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-brand-500" />
          </marker>
        </defs>

        {/* Consumer */}
        <g>
          <rect x="20" y="120" width="170" height="80" rx="12" className="fill-brand-50 stroke-brand-200" />
          <text x="105" y="152" textAnchor="middle" className="fill-brand-900" fontSize="17" fontWeight="700">
            Consumer
          </text>
          <text x="105" y="174" textAnchor="middle" className="fill-brand-600" fontSize="13">
            Sets money aside
          </text>
        </g>

        {/* Arrow to custodial */}
        <line
          x1="195"
          y1="160"
          x2="285"
          y2="160"
          className="stroke-brand-500"
          strokeWidth="2.5"
          markerEnd="url(#fbo-arrow)"
        />
        <text x="240" y="148" textAnchor="middle" className="fill-brand-600" fontSize="12">
          contributes
        </text>

        {/* Segregated custodial account (highlighted) */}
        <g>
          <rect x="290" y="90" width="210" height="140" rx="14" className="fill-accent-50 stroke-accent-300" strokeWidth="2" />
          <text x="395" y="128" textAnchor="middle" className="fill-brand-900" fontSize="17" fontWeight="700">
            Segregated
          </text>
          <text x="395" y="150" textAnchor="middle" className="fill-brand-900" fontSize="17" fontWeight="700">
            custodial account
          </text>
          <text x="395" y="178" textAnchor="middle" className="fill-accent-700" fontSize="13" fontWeight="600">
            Held FBO the consumer
          </text>
          <text x="395" y="198" textAnchor="middle" className="fill-brand-600" fontSize="12">
            Not the platform’s property
          </text>
        </g>

        {/* Separation barrier */}
        <line x1="540" y1="40" x2="540" y2="280" className="stroke-brand-200" strokeWidth="2" strokeDasharray="6 7" />
        <text x="540" y="32" textAnchor="middle" className="fill-brand-400" fontSize="11" fontWeight="600" letterSpacing="0.08em">
          KEPT SEPARATE
        </text>

        {/* Operating funds */}
        <g>
          <rect x="575" y="120" width="165" height="80" rx="12" className="fill-white stroke-brand-200" />
          <text x="657" y="152" textAnchor="middle" className="fill-brand-900" fontSize="16" fontWeight="700">
            Operating funds
          </text>
          <text x="657" y="174" textAnchor="middle" className="fill-brand-600" fontSize="12">
            $5/mo fee · admin only
          </text>
        </g>

        {/* Disbursement note */}
        <line
          x1="395"
          y1="230"
          x2="395"
          y2="276"
          className="stroke-brand-500"
          strokeWidth="2.5"
          markerEnd="url(#fbo-arrow)"
        />
        <text x="395" y="298" textAnchor="middle" className="fill-brand-700" fontSize="13" fontWeight="600">
          Disbursed only as intended (e.g. to settle a debt)
        </text>
      </svg>
    </figure>
  );
}
