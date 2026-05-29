import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  classifyDocusealEvent,
  normalizeEmail,
  submissionIdOf,
  pickExecutedPdfUrl,
  pickCertificateUrl,
  buildSubmissionPayload,
} from "./docuseal.ts";

Deno.test("classifyDocusealEvent maps the lifecycle", () => {
  assertEquals(classifyDocusealEvent("form.viewed"), {
    scope: "signer",
    signerStatus: "viewed",
    requestStatus: "viewed",
  });
  assertEquals(classifyDocusealEvent("form.completed"), {
    scope: "signer",
    signerStatus: "signed",
    requestStatus: "partially_signed",
  });
  assertEquals(classifyDocusealEvent("form.declined"), {
    scope: "signer",
    signerStatus: "declined",
    requestStatus: "declined",
  });
  assertEquals(classifyDocusealEvent("submission.completed"), {
    scope: "submission",
    requestStatus: "completed",
  });
  assertEquals(classifyDocusealEvent("submission.expired"), {
    scope: "submission",
    requestStatus: "expired",
  });
  assertEquals(classifyDocusealEvent("unknown.thing"), { scope: "other" });
  assertEquals(classifyDocusealEvent(null), { scope: "other" });
});

Deno.test("normalizeEmail", () => {
  assertEquals(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
  assertEquals(normalizeEmail(null), "");
});

Deno.test("submissionIdOf handles form (nested) and submission (top-level) shapes", () => {
  assertEquals(submissionIdOf({ id: 5, submission_id: 42 }), 42); // form event → submission_id
  assertEquals(submissionIdOf({ id: 42, documents: [{ url: "x" }] }), 42); // submission event
  assertEquals(submissionIdOf({ submission: { id: 7 } }), 7);
  assertEquals(submissionIdOf({ id: 9 }), null); // no submission context
  assertEquals(submissionIdOf(null), null);
});

Deno.test("pickExecutedPdfUrl / pickCertificateUrl", () => {
  assertEquals(pickExecutedPdfUrl({ documents: [{ url: "https://d/x.pdf" }] }), "https://d/x.pdf");
  assertEquals(pickExecutedPdfUrl({ combined_document_url: "https://d/c.pdf" }), "https://d/c.pdf");
  assertEquals(pickExecutedPdfUrl({}), null);
  assertEquals(pickCertificateUrl({ audit_log_url: "https://d/a.pdf" }), "https://d/a.pdf");
  assertEquals(pickCertificateUrl({}), null);
});

Deno.test("buildSubmissionPayload orders signers and maps delivery", () => {
  const signers = [
    { signer_role: "Client", name: "B", email: "b@x.com", order_index: 1, id: "s2" },
    {
      signer_role: "Attorney",
      name: "A",
      email: "a@x.com",
      phone: "+15551112222",
      order_index: 0,
      id: "s1",
    },
  ];
  const p = buildSubmissionPayload(101, signers, {
    signingMode: "sequential",
    deliveryMethod: "email_sms",
  });
  assertEquals(p.template_id, 101);
  assert(p.send_email && p.send_sms);
  assertEquals(p.order, "preserved");
  assertEquals(
    p.submitters.map((s) => s.role),
    ["Attorney", "Client"],
  ); // sorted by order_index
  assertEquals(p.submitters[0].external_id, "s1");
  assertEquals(p.submitters[0].phone, "+15551112222");

  const p2 = buildSubmissionPayload(1, signers, { deliveryMethod: "sms_only" });
  assert(!p2.send_email && p2.send_sms);
  assertEquals(p2.order, "random");
});
