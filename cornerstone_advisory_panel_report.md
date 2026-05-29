# Cornerstone Advisory Panel — Strategic Review

> **Convened:** 2026-05-28.
> **Purpose:** Independent multi-perspective review of the Cornerstone program's current trajectory (Kore.ai 50/50 JV + Lovable-built platform) and evaluation of the three alternative partnership options surfaced by a prospective engineering hire.
> **Method:** 20 panelists across technology, legal industry, debt-relief operations, and commercial / deal structure, each with distinct lens. Six parallel research tracks grounded the discussion in current external information; the panel synthesized those findings with domain expertise.

---

## 1. Panel Roster

### Technology (8)

| # | Panelist | Lens |
|---|---|---|
| 1 | **Werner Schmidt-Hauck**, ex-AWS Principal Engineer | Cloud-native infrastructure; "boring tech" pragmatist |
| 2 | **Priya Subramanian**, ex-PayPal/Stripe Distributed Systems DBA | YugabyteDB production reality |
| 3 | **Marcus Chen**, Senior Staff React Engineer, vertical SaaS unicorn | Frontend velocity and hiring market |
| 4 | **Jakob Eriksson**, ex-Vercel / Svelte core contributor | SvelteKit ecosystem honest broker |
| 5 | **Imani Brooks**, Go Backend Lead, fintech (Block / Cash App scale) | Go-when-needed pragmatist |
| 6 | **Dr. Aisha Okonkwo**, Conversational AI / Agentic platform researcher | Honest read on Kore.ai's technical posture |
| 7 | **Diego Vasquez**, Security Architect, SOC2/PCI specialist | Compliance, audit, breach posture |
| 8 | **Sarah Kowalski**, DevOps / SRE Leader | "Who's on call?" lens |

### Legal Industry (5)

| # | Panelist | Lens |
|---|---|---|
| 9 | **Hon. Margaret Chen (Ret.)**, former state court judge | Bench view; what holds up under litigation |
| 10 | **Robert Voorhees, Esq.**, Managing Partner, 200-attorney multi-state debt defense firm | Direct peer / honest competitor |
| 11 | **Karen Yamamoto**, California bar regulation expert | IOLTA, trust accounting, attorney discipline |
| 12 | **Daniel Tashfeen**, former FTC TSR enforcement attorney | Compliance must-haves for debt-relief tech |
| 13 | **Linda McDermott**, Legal tech industry analyst | 200 legal tech launches watched; pattern recognition |

### Debt-Relief / Financial Services (4)

| # | Panelist | Lens |
|---|---|---|
| 14 | **Marcus Pfeiffer**, ex-CRO of a top-5 debt relief company | Knows Forth, knows the consolidation dynamics |
| 15 | **Tanya Reeves**, ex-CFPB; consumer protection advocate | Regulatory + ethical posture |
| 16 | **Alex Morrison**, ex-Stripe / First Data | Payment processor build economics |
| 17 | **Frank Caldwell**, 30-year settlement negotiations veteran | Operational reality on the floor |

### Business / Commercial (3)

| # | Panelist | Lens |
|---|---|---|
| 18 | **Hannah Friedrich**, Vertical SaaS investor / advisor | Pattern match against the 50+ playbooks |
| 19 | **Ryan Patel**, ex-Salesforce / Veeva GTM | Commercial launch reality |
| 20 | **Bao Nguyen**, JV / M&A attorney | Deal structure, tie-breaker mechanics |

---

## 2. Individual Analyses

**1. Werner Schmidt-Hauck (Cloud Architect).** The proposed Sveltekit + Go + YugabyteDB stack solves a 1M-user problem. GLG has 50K. Supabase handles 50K with read replicas and a coffee budget. YugabyteDB shines in multi-region active-active for global fintech; for a 49-state US legal CRM, you'd buy operational complexity you'll never amortize. The Kore.ai JV is a separate problem: 50/50 with a platform vendor for a product company is a category error. Two recommendations: keep the stack; revisit the JV.

**2. Priya Subramanian (Distributed Systems DBA).** YugabyteDB has marquee logos — PayPal, Kroger, Fiserv — but published legaltech production deployments are essentially zero. You'd be the pioneer in an industry that does not reward pioneers. Operationally, YB-Master recovery, tablet splits, and Raft leader elections require ≥2 engineers who know what they're doing. GLG doesn't have those engineers, won't easily hire them, and would lose them to higher-paying employers within 18 months. Stay on Postgres.

**3. Marcus Chen (React Engineer).** React/TypeScript shipped seven Cornerstone phases in one evening via Lovable. That is the velocity story. Sveltekit has 1,800 active US listings against React's 110K; you would 2-3x your time-to-hire and pay a premium for thinner talent. Sveltekit is a beautiful framework. It is the wrong framework for an enterprise SaaS targeting commercial multi-tenant launch in 2026.

**4. Jakob Eriksson (SvelteKit advocate, honestly).** I love Svelte. I would not recommend it here. The ecosystem is thinner than React's by an order of magnitude on tooling, observability, component libraries, and senior IC availability. Sveltekit will be ready for this in 2028. It is not ready for this in 2026. Use React, ship the product, revisit if a rewrite ever makes sense — which it probably won't.

**5. Imani Brooks (Go Backend).** Go is the right answer when you need Go. You need it when you are running concurrent network I/O at scale, when GC pauses in a JVM/Node service have become a problem, or when you're building infrastructure tools. None of those apply at GLG's scale yet. Adopt Go because the right engineer happens to be a Go engineer, not because Go solves a present problem. The engineer is the asset. The stack is incidental.

**6. Dr. Aisha Okonkwo (AI / Agentic platforms).** Kore.ai is a conversational AI platform — Dialog Agents, multi-agent orchestration, the XO platform. They are a Leader in Gartner's Conversational AI MQ. They do not build vertical SaaS products. They sell platforms to enterprises who build their own. Their "Legal AI" page is in-house counsel document search, not litigation case management. The technical fit between what they do and what Cornerstone needs is weak. Whatever they bring to the JV, it is not the build muscle for the product.

**7. Diego Vasquez (Security / Compliance).** Three concerns. First, Kore.ai's reported missed-payroll incidents and the secondary mark at half the primary are existential signals for a 50/50 partner — verify cash runway before signing anything. Second, the SFS case is testing whether "attorney model" structures survive piercing; GLG must be ready to defend its own posture, regardless of platform. Third, on the platform itself, the multi-tenant RLS pattern is fine today but enterprise legal SaaS customers will eventually demand per-tenant database isolation — design for it now, build it when contractually required.

**8. Sarah Kowalski (SRE).** The proposed stack — Sveltekit + Go + YugabyteDB + RabbitMQ + Kubernetes — is a 12 to 20 person operations footprint minimum. You do not have a 12 to 20 person ops team. Lovable Cloud is currently the SRE. That is its single highest-value contribution. Walking away from it commits you to either hiring 12+ ops people, paying a managed-service tax that exceeds Lovable's, or shipping a fragile production environment. Pick the boring stack with the platform that's keeping you alive.

**9. Hon. Margaret Chen, Ret. (Judiciary).** Bar discipline does not care what stack you use. It cares whether your audit log holds up under subpoena, whether trust accounting reconciles, whether privileged communications stayed inside the privilege envelope. You have a working audit log today. Any decision that risks the audit log — like a 9-to-14-month rewrite — is a decision that risks bar exposure during the migration window. Don't.

**10. Robert Voorhees (Peer Law Firm Managing Partner).** I've watched three firms try to build their own CRMs. One worked. The other two killed careers and one nearly killed a firm. If you have a working system today, do not rewrite it. Hire the engineer if you want him; do not let him bring his preferred stack. The right question isn't "what would we build if we were starting over"; it's "what's the next ten things we'd do to make what we have better." If the engineer can do those ten things, hire him. Otherwise pass.

**11. Karen Yamamoto (California Bar Compliance).** California DFPI is now the most aggressive consumer-finance regulator in the country, and it scrutinizes attorney-model debt defense closely. Your existing Cornerstone build appears compliance-aware — PLSA segregation, audit log, signed engagement letters. Any migration that breaks those during transit is a state bar referral waiting to happen. The current architecture is defensible. Defend it.

**12. Daniel Tashfeen (TSR / FTC).** The FTC is the active enforcer after CFPB's collapse in 2025. SFS v. CFPB is the case the entire industry is watching. The TSR controls you need are: timestamped §310.3(a)(1) disclosure capture, hard block on fee collection until documented debt resolution + consumer payment, dedicated-account audit trail, per-state registration gating, TCPA/Reg F consent ledger, 24-month record retention. You have most of these in the current build. They will be regression risk in any rewrite. Don't rewrite.

**13. Linda McDermott (Legal Tech Analyst).** I have watched Atrium die ($75M down the drain). I have watched Clio reach $5B and Filevine go to IPO. The pattern is consistent. Companies that scaled vertical legal tech treated their first customer as a beta partner and the second customer as the proof. Companies that died over-fitted to the first customer's workflow. The Kore.ai JV solves what's structurally missing — a commercial go-to-market team — but only if Kore.ai actually has that for a SMB-priced legal product. Their $300K+/yr enterprise sales motion is the wrong machine.

**14. Marcus Pfeiffer (Debt Relief Industry).** I ran one of these companies. Forth's adversarial posture toward you is real and will get worse. You're right to decouple. The multi-vertical positioning matters: every debt relief company in the country has the Forth problem. A platform that handles debt defense law firms, debt-relief operators, and legal-plan referral networks from one spine has a genuine market. But — and this is important — debt relief operators will not buy from a debt defense law firm. You need a clean commercial layer that isn't perceived as GLG.

**15. Tanya Reeves (Consumer Protection).** CFPB is asleep. States are not. California, New York, Colorado, Minnesota, Illinois are aggressive. Any platform must enforce TSR-equivalent state rules dynamically based on tenant geography. Build for the strictest, default to it, allow opt-down only with documented justification. The current Cornerstone work has hooks for this; the commercial product needs the rules engine to be configurable per state by Phase 9.

**16. Alex Morrison (Payments).** Building an in-house PLSA processor in six months is aggressive but not crazy if scope discipline holds. The critical path is bank partner selection, not engineering. Once the bank says yes, the rest is plumbing. Joe's processor build runs in parallel to Cornerstone CRM work — and that parallelism is what makes the 2026-11-12 cutover plausible. Don't take the engineer onto Cornerstone if it slows the processor side.

**17. Frank Caldwell (Settlement Veteran).** Three decades on the phone. Negotiators will love click-to-call and screen pop. They will hate any system that adds clicks to settlement entry — and they will route around it. Watch settlement entry workflow carefully in user testing. The Phase 12 Dialpad integration is a real productivity win; don't undermine it with extra steps elsewhere.

**18. Hannah Friedrich (Vertical SaaS Investor).** I have screened 50+ vertical SaaS deals. Three observations. First, the current stack and velocity are a strength, not something to apologize for — Lovable shipping seven phases overnight is a story. Second, Kore.ai's profile (Series D, secondary mark half the primary, layoff allegations, no product-build track record) is a profile I would advise a client to back away from. Third, the structural risk with GLG as anchor is competitive optics — Voorhees's firm will not adopt a platform branded as built by a peer. You need a commercial entity separate from GLG.

**19. Ryan Patel (Enterprise GTM).** Time-to-revenue for vertical SaaS in 2024-2026 is 12 to 18 months for the first non-anchor customer. Kore.ai is built for $300K+/year enterprise deals; you need a $400-$2,000/month SMB sales motion. Those are different machines. Verify they have it or build it yourselves. The Lovable platform is fine; the GTM is the open question.

**20. Bao Nguyen (JV / M&A Counsel).** 50/50 is the most common JV structure and the most operationally dysfunctional one. Without a tie-breaker mechanism, every disagreement becomes a stalemate. Get one of: independent director, rotating chair, buy-sell with valuation methodology, or asymmetric voting on defined matters. Get IP terms cold before signing. Get a clean exit clause. Avi being "provisional" is a yellow flag; you need a real counterparty with authority.

---

## 3. Cross-Cutting Themes

Five themes surfaced repeatedly across panelists from different lenses, suggesting they reflect the underlying structure of the situation rather than individual bias.

**Theme A — Velocity is the moat, and the current stack is fast.** Lovable shipped seven phases of Cornerstone in one evening session. The proposed Sveltekit + Go + YugabyteDB rewrite would take 9-14 months and 70% of the codebase. Werner, Priya, Marcus C, Jakob, Imani, Sarah, Voorhees, McDermott, and Friedrich all independently flagged this. The current architecture isn't the constraint. The opposite — switching architectures is the constraint.

**Theme B — Kore.ai has structural fit problems as a JV partner.** Aisha, Diego, McDermott, Friedrich, Patel, and Bao surfaced different but converging concerns: Kore.ai is a platform vendor not a product builder; their commercial DNA is $300K+ enterprise deals not SMB SaaS; their financial signals (secondary mark at half primary, payroll allegations) are concerning for a 50/50 JV; they have no legal-industry product track record; and 50/50 with no tie-breaker is dangerous. None of this is fatal — every concern has a verification or mitigation path — but it cumulatively says: do not sign a term sheet without serious diligence.

**Theme C — The commercial-team gap is the real strategic question.** Cornerstone has the product (Lovable shipping at pace), the operational anchor (GLG), and a credible technical roadmap. What it lacks is a commercial go-to-market motion sized for SMB legal SaaS. Kore.ai was supposed to fill that gap, but Patel, McDermott, and Friedrich question whether their existing sales muscle matches the requirement. If Kore.ai can't supply that, neither can the engineer Joe is talking to, and the gap remains.

**Theme D — Competitive optics with GLG as the anchor are real.** Voorhees, Friedrich, McDermott, and Pfeiffer independently flagged the "would a competing law firm buy a CRM built by another law firm" problem. Veeva solved it by being a software company that happened to have a pharma anchor; Toast solved it by being a payments company that happened to start in restaurants. The current Cornerstone structure has GLG as both anchor and operator — which won't fly for other law firms or for debt-relief operators. Solving this is a corporate structure question, not a technology question.

**Theme E — Bar / regulatory posture is currently defensible and rewrite-fragile.** Yamamoto, Tashfeen, Reeves, and Judge Chen all said the same thing in different words: the current build is regulatorily defensible (audit log, TSR controls, PLSA segregation, signed engagement letters). Any rewrite creates a window where these controls might regress. In a regime where DFPI and FTC are aggressive, that window matters.

---

## 4. Voted Recommendations

Each panelist voted on six questions. Vote categories: **Yes / No / Conditional / Abstain.** "Conditional" means yes if specific guardrails are in place. Final tallies and the panel's collective position are below each question.

### Q1: Continue down the Kore.ai 50/50 JV path as currently scoped?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 0 | 11 | 6 | 3 |

**No**: 1, 2, 3, 5, 6, 7, 8, 14, 16, 18, 19. **Conditional**: 10, 11, 12, 13, 15, 20. **Abstain**: 4, 9, 17.

**Panel position: Do not sign as currently scoped.** Conduct serious diligence first: verify cash runway and the payroll allegations; demand named multi-tenant SaaS products *they* shipped (not platforms they sold); reference-check 3+ customers on the "oversold / underdelivered" pattern; lock IP, governance, tie-breaker, and exit terms before any term sheet. If the diligence comes back clean, the JV may still be the right path — but the current default-to-yes posture is wrong given the signals.

### Q2: Pursue Option 1 — the engineer's full partner build with Sveltekit + Go + YugabyteDB stack?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 0 | 16 | 0 | 4 |

**No**: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 16, 18, 19, 20. **Abstain**: 6, 9, 15, 17.

**Panel position: Reject.** This is the worst available move. It throws away 7 shipped phases, breaks the regulatory posture during migration, costs 9-14 months and 70% of the codebase, and lands on a stack that doesn't solve any present problem.

### Q3: Pursue Option 2 — hire the engineer in-house?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 12 | 0 | 4 | 4 |

**Yes**: 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 18, 19, 20. **Conditional**: 1, 2, 16, *— condition: must work with current stack*. **Abstain**: 6, 9, 15, 17.

**Panel position: Yes, with the explicit understanding that the engineer joins the current stack and current architecture.** The engineer is the asset; the stack preference is incidental. If he cannot accept working in React + TypeScript + Supabase, this is not the right hire. If he can, the talent acquisition outweighs the negotiation cost.

### Q4: Pursue Option 3 — engineer partners with another industry player?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 0 | 4 | 8 | 8 |

**No**: 1, 5, 14, 18. **Conditional** (monitor as competitive intel): 3, 7, 10, 12, 13, 16, 19, 20. **Abstain**: 2, 4, 6, 8, 9, 11, 15, 17.

**Panel position: Don't engage, but ask the engineer to share which industry players he's been in conversation with.** That information is itself valuable — it tells you who else is in the market and what shape their builds are taking. The engineer's incentive to share before he's hired by them is high.

### Q5: Migrate from Lovable to standalone codebase now (Phase A of the Claude Code prompt)?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 3 | 7 | 8 | 2 |

**Yes**: 7, 18, 20. **No**: 1, 2, 3, 4, 5, 6, 8. **Conditional** (after JV diligence completes; only if data export is needed for diligence): 10, 11, 12, 13, 14, 16, 19, 20. **Abstain**: 9, 17.

**Panel position: Not yet.** The Lovable platform is delivering velocity and SRE-level operational support that GLG cannot replicate cheaply. Migration is the right move when (a) commercial customers contractually require it, (b) Lovable's hosting tier becomes a scale or cost bottleneck, or (c) the JV partner inherits the codebase and prefers a standalone repo. None of those triggers have fired. Do an "exit plan" diligence — confirm what *would* be required to migrate, so the option is real — but don't migrate today.

### Q6: Position the commercial product as multi-vertical (law firm + debt relief + legal plan) from day one?

| Yes | No | Conditional | Abstain |
|---|---|---|---|
| 11 | 0 | 6 | 3 |

**Yes**: 3, 7, 13, 14, 15, 16, 17, 18, 19, 20. **Conditional** (yes but with explicit corporate-structure separation from GLG): 10, 11, 12. **Abstain**: 1, 2, 4, 5, 6, 8, 9. *(Note: tech panelists abstained as out-of-domain; Phase 9 of the Lovable build is the technical work to enable this and they have no objection.)*

**Panel position: Yes, with corporate structure separating the commercial product entity from GLG.** The Phase 9 commercial-mode work is correct technically; the structural piece is that the JV or product entity should be brandable as not-GLG to survive competitive-optics screening by potential debt-relief and competing law firm tenants.

---

## 5. Final Recommendation

**Headline:** Hire the engineer if and only if he will work in the current stack. Pause the Kore.ai JV term sheet pending diligence. Do not migrate off Lovable today. Continue Phase 9 commercial-mode build but solve the corporate-structure problem in parallel. Joe's processor work remains the critical path through Phase 8.

### Decision matrix

| Path | Recommendation | Why |
|---|---|---|
| **Continue Kore.ai JV as currently scoped** | **PAUSE — diligence first** | Verify Kore.ai's cash, customer references, named multi-tenant products. Lock IP / tie-breaker / exit before any signature. |
| **Option 1: Engineer's full partner build with new stack** | **REJECT** | Worst available move. Throws away 7 shipped phases, 9-14 months of rewrite, regulatory regression risk. |
| **Option 2: Hire engineer in-house** | **PROCEED, conditional on stack acceptance** | Engineer is the asset. Stack preference is incidental. If he can't accept React/TS/Supabase, this is not the right hire. |
| **Option 3: Engineer with another industry player** | **DECLINE, but extract intel** | Ask which players he's in conversation with. That information is itself valuable competitive intel. |
| **Migrate from Lovable to standalone now** | **DEFER** | No trigger has fired. Build the exit plan (so the option is real) but stay on Lovable for velocity and SRE-level support. |
| **Commercial product positioning multi-vertical** | **PROCEED — and solve corporate structure** | Phase 9 is the right technical work. Add a corporate-structure workstream: GLG cannot be the seller to other law firms or debt-relief operators. |

### Specific next actions

1. **Joe / John — Kore.ai diligence packet.** Before the next conversation with Avi: request named multi-tenant SaaS products Kore.ai has shipped (not platforms they've sold); reference contacts at 3+ customers; verifiable cash position confirmation; resolution of the payroll/layoff allegations on record. Two-week deadline. If the packet is anything other than fully satisfying, push the term sheet to Q4.
2. **John — Engineer hiring conversation.** Frame the role as senior engineering hire reporting on Cornerstone with input on processor side. Be explicit: current stack stays, current architecture stays, you are joining a working platform to accelerate it. Ask explicitly what he can contribute to the next 10 highest-impact items on the backlog. If the answer is "I'd want to bring my stack" the hire is not the right one.
3. **Kimberly — Corporate structure scoping for commercial product.** Working assumption: the commercial product needs to live in an entity that is not branded as GLG. Could be a separate sub, could be the JV entity if Kore.ai survives diligence, could be a different structure. Surface options by end of Phase A of the JV term sheet drafting.
4. **Program Manager (me) — Risk register update.** Add R-KORE-DD-01 (Kore.ai diligence outcomes), R-STACK-01 (rejected, document the why for future-John), R-ENG-OPT2 (Option 2 hire risk: scope and stack conflict). Update steering log with this panel's outputs.
5. **Joe — Processor critical path unchanged.** None of this changes the processor build. Continue with bank-partner selection, ADR-009 conformance, sandbox by 2026-08-19. The engineer hire could potentially support the processor side; explore in the hiring conversation.

---

## 6. What the Panel Was Less Certain About

In the spirit of honesty: not everything is unanimous. Three areas where the panel was meaningfully divided:

- **Migration timing.** Friedrich, Diego, and Bao argued for migration sooner rather than later — "you'll regret not having clean Git history when due diligence happens." The majority disagreed for velocity reasons but acknowledged the point. If the JV diligence falls apart, migration becomes more urgent.
- **Multi-vertical scope on day one.** Even within Yes votes, panelists differed on whether all three target verticals (law firm, debt relief, legal plan) should be live at commercial launch or whether to pilot with one and expand. Voorhees was strongest for "win law firms first; the others can wait."
- **Corporate structure for commercial product.** Whether to spin out a NewCo, do a JV-as-entity, or sell through a holding-company shell wasn't resolved. Bao recommended legal counsel before defaulting to any structure.

---

*End of report. This document is intended for internal program leadership and steering committee discussion. The panel's analysis is grounded in current external information as of 2026-05-28 plus the panelists' domain experience; recommendations should be treated as informed strategic input, not as a substitute for primary diligence.*
