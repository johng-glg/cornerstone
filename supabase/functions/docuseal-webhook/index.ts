import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DocuSealWebhookPayload {
  event_type: string;
  timestamp: string;
  data: {
    id: number;
    submission_id: number;
    email: string;
    status: string;
    completed_at?: string;
    declined_at?: string;
    documents?: Array<{
      name: string;
      url: string;
    }>;
    audit_log_url?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    ua?: string;
  };
}

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DocuSealWebhookPayload = await req.json();

    console.log(`Received DocuSeal webhook: ${payload.event_type}`, JSON.stringify(payload));

    const { event_type, data } = payload;
    const submitterId = data.id;
    const submissionId = data.submission_id;

    // Find the signer by DocuSeal submitter ID
    const { data: signer, error: signerError } = await supabase
      .from("signature_signers")
      .select("*, request:signature_requests(*)")
      .eq("docuseal_submitter_id", submitterId)
      .single();

    if (signerError || !signer) {
      console.log(`Signer not found for submitter ID ${submitterId}, trying by email`);
      
      // Try to find by email and submission ID
      const { data: requestBySubmission } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("docuseal_submission_id", submissionId)
        .single();

      if (requestBySubmission) {
        const { data: signerByEmail } = await supabase
          .from("signature_signers")
          .select("*, request:signature_requests(*)")
          .eq("request_id", requestBySubmission.id)
          .eq("email", data.email)
          .single();

        if (signerByEmail) {
          await processWebhookEvent(supabase, event_type, data, signerByEmail);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      console.error(`Could not find signer for webhook event`);
      return new Response(JSON.stringify({ success: false, error: "Signer not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    await processWebhookEvent(supabase, event_type, data, signer);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing DocuSeal webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function processWebhookEvent(
  supabase: SupabaseClientAny,
  eventType: string,
  data: DocuSealWebhookPayload["data"],
  signer: Record<string, unknown>
) {
  const requestId = signer.request_id as string;
  const signerId = signer.id as string;

  console.log(`Processing ${eventType} for signer ${signerId} on request ${requestId}`);

  // Log the event
  await supabase.from("signature_events").insert({
    request_id: requestId,
    signer_id: signerId,
    event_type: eventType.replace("form.", ""),
    event_data: {
      ip: data.ip,
      user_agent: data.ua,
      docuseal_data: data,
    },
    occurred_at: new Date().toISOString(),
  });

  switch (eventType) {
    case "form.viewed":
      await handleFormViewed(supabase, requestId, signerId);
      break;

    case "form.started":
      // Just log, no status change needed
      console.log(`Signer ${signerId} started signing`);
      break;

    case "form.completed":
      await handleFormCompleted(supabase, requestId, signerId, data);
      break;

    case "form.declined":
      await handleFormDeclined(supabase, requestId, signerId);
      break;

    case "submission.completed":
      await handleSubmissionCompleted(supabase, requestId, data);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

async function handleFormViewed(
  supabase: SupabaseClientAny,
  requestId: string,
  signerId: string
) {
  // Update signer status to viewed
  await supabase
    .from("signature_signers")
    .update({ status: "viewed" })
    .eq("id", signerId);

  // Update request status to viewed if still in sent status
  const { data: request } = await supabase
    .from("signature_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (request?.status === "sent") {
    await supabase
      .from("signature_requests")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  console.log(`Updated signer ${signerId} to viewed`);
}

async function handleFormCompleted(
  supabase: SupabaseClientAny,
  requestId: string,
  signerId: string,
  data: DocuSealWebhookPayload["data"]
) {
  // Update signer status to signed
  await supabase
    .from("signature_signers")
    .update({
      status: "signed",
      signed_at: data.completed_at || new Date().toISOString(),
      ip_address: data.ip || null,
      user_agent: data.ua || null,
    })
    .eq("id", signerId);

  // Check if all signers have signed
  const { data: allSigners } = await supabase
    .from("signature_signers")
    .select("status")
    .eq("request_id", requestId);

  const allSigned = allSigners?.every((s: { status: string }) => s.status === "signed");
  const someSigned = allSigners?.some((s: { status: string }) => s.status === "signed");

  if (allSigned) {
    // All signers completed - update to completed
    await supabase
      .from("signature_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    console.log(`All signers completed for request ${requestId}`);
  } else if (someSigned) {
    // Some signers completed - update to partially_signed
    await supabase
      .from("signature_requests")
      .update({
        status: "partially_signed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    console.log(`Request ${requestId} is partially signed`);
  }
}

async function handleFormDeclined(
  supabase: SupabaseClientAny,
  requestId: string,
  signerId: string
) {
  // Update signer status to declined
  await supabase
    .from("signature_signers")
    .update({ status: "declined" })
    .eq("id", signerId);

  // Update request status to declined
  await supabase
    .from("signature_requests")
    .update({
      status: "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  console.log(`Signer ${signerId} declined, request ${requestId} marked as declined`);
}

async function handleSubmissionCompleted(
  supabase: SupabaseClientAny,
  requestId: string,
  data: DocuSealWebhookPayload["data"]
) {
  console.log(`Submission completed for request ${requestId}`);

  // Get the executed PDF and certificate URLs from DocuSeal
  const documents = data.documents || [];
  const executedPdf = documents.find((d) => d.name?.includes("signed") || d.url?.includes("signed"));
  const certificate = documents.find((d) => d.name?.includes("certificate") || d.name?.includes("audit"));

  const updateData: Record<string, unknown> = {
    status: "completed",
    completed_at: data.completed_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence_json: data,
  };

  if (executedPdf?.url) {
    updateData.executed_pdf_url = executedPdf.url;
  }

  if (certificate?.url) {
    updateData.certificate_url = certificate.url;
  }

  if (data.audit_log_url) {
    updateData.certificate_url = data.audit_log_url;
  }

  await supabase
    .from("signature_requests")
    .update(updateData)
    .eq("id", requestId);

  // Log completion event
  await supabase.from("signature_events").insert({
    request_id: requestId,
    event_type: "completed",
    event_data: {
      documents: documents.map((d) => ({ name: d.name, url: d.url })),
      audit_log_url: data.audit_log_url,
    },
    occurred_at: new Date().toISOString(),
  });

  console.log(`Request ${requestId} fully completed with documents`);

  // TODO: Download and store PDFs to Supabase Storage
  // TODO: Create timeline entry on Lead/Client record
}
