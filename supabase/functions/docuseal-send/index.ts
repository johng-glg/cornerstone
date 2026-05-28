import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendRequest {
  signature_request_id: string;
}

interface SignatureSigner {
  id: string;
  signer_role: string;
  name: string;
  email: string;
  phone: string | null;
  order_index: number;
}

interface SignatureRequest {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  docuseal_template_id: number;
  title: string;
  signing_mode: string;
  delivery_method: string;
  language: string;
  expires_at: string | null;
  short_token: string;
  created_by: string | null;
  signers: SignatureSigner[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const __gate = await (await import("../_shared/requireAuth.ts")).requireAuth(req);
    if (__gate instanceof Response) return __gate;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const docusealApiKey = Deno.env.get("DOCUSEAL_API_KEY");
    const docusealApiUrl = Deno.env.get("DOCUSEAL_API_URL") || "https://api.docuseal.com";

    if (!docusealApiKey) {
      throw new Error("DOCUSEAL_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { signature_request_id }: SendRequest = await req.json();

    if (!signature_request_id) {
      throw new Error("signature_request_id is required");
    }

    console.log(`Processing signature request: ${signature_request_id}`);

    // Fetch the signature request with signers
    const { data: request, error: fetchError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        signers:signature_signers(*)
      `)
      .eq("id", signature_request_id)
      .single();

    if (fetchError || !request) {
      throw new Error(`Failed to fetch signature request: ${fetchError?.message}`);
    }

    const signatureRequest = request as SignatureRequest;

    if (!signatureRequest.docuseal_template_id) {
      throw new Error("No DocuSeal template ID configured for this request");
    }

    if (!signatureRequest.signers || signatureRequest.signers.length === 0) {
      throw new Error("No signers configured for this request");
    }

    console.log(`Found ${signatureRequest.signers.length} signers`);

    // Update status to queued
    await supabase
      .from("signature_requests")
      .update({ status: "queued", updated_at: new Date().toISOString() })
      .eq("id", signature_request_id);

    // Build DocuSeal submission request
    // Sort signers by order_index for sequential signing
    const sortedSigners = [...signatureRequest.signers].sort(
      (a, b) => a.order_index - b.order_index
    );

    const submitters = sortedSigners.map((signer) => ({
      email: signer.email,
      name: signer.name,
      phone: signer.phone || undefined,
      role: signer.signer_role,
      send_email: true, // DocuSeal sends signing emails
      send_sms: false,
    }));

    const docusealPayload = {
      template_id: signatureRequest.docuseal_template_id,
      send_email: true,
      send_sms: false,
      order: signatureRequest.signing_mode === "sequential" ? "preserved" : "random",
      submitters,
    };

    console.log("Creating DocuSeal submission:", JSON.stringify(docusealPayload));

    // Call DocuSeal API to create submission
    const docusealResponse = await fetch(`${docusealApiUrl}/submissions`, {
      method: "POST",
      headers: {
        "X-Auth-Token": docusealApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(docusealPayload),
    });

    if (!docusealResponse.ok) {
      const errorText = await docusealResponse.text();
      console.error("DocuSeal API error:", errorText);
      
      // Update status to error
      await supabase
        .from("signature_requests")
        .update({ 
          status: "error", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", signature_request_id);

      // Log error event
      await supabase.from("signature_events").insert({
        request_id: signature_request_id,
        event_type: "error",
        event_data: { error: errorText, status: docusealResponse.status },
        occurred_at: new Date().toISOString(),
      });

      throw new Error(`DocuSeal API error: ${docusealResponse.status} - ${errorText}`);
    }

    const docusealResult = await docusealResponse.json();
    console.log("DocuSeal submission created:", JSON.stringify(docusealResult));

    // Extract submission ID and submitter details
    // DocuSeal returns an array of submitters for the submission
    const submissionId = docusealResult[0]?.submission_id || docusealResult.id;
    
    // Update each signer with their DocuSeal submitter ID and signing URL
    for (const submitter of docusealResult) {
      const matchingSigner = signatureRequest.signers.find(
        (s) => s.email.toLowerCase() === submitter.email.toLowerCase()
      );

      if (matchingSigner) {
        // Generate a short token for this specific signer
        const signerShortToken = crypto.randomUUID().replace(/-/g, "").substring(0, 24);
        
        await supabase
          .from("signature_signers")
          .update({
            docuseal_submitter_id: submitter.id,
            signing_url: submitter.embed_src || `${docusealApiUrl.replace('/api', '')}/s/${submitter.slug}`,
            short_token: signerShortToken,
            status: "sent",
          })
          .eq("id", matchingSigner.id);

        console.log(`Updated signer ${matchingSigner.email} with submitter ID ${submitter.id}`);
      }
    }

    // Update signature request with submission ID and status
    await supabase
      .from("signature_requests")
      .update({
        docuseal_submission_id: submissionId,
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", signature_request_id);

    // Log sent event
    await supabase.from("signature_events").insert({
      request_id: signature_request_id,
      event_type: "sent",
      event_data: {
        docuseal_submission_id: submissionId,
        signers_count: signatureRequest.signers.length,
      },
      occurred_at: new Date().toISOString(),
    });

    console.log(`Signature request ${signature_request_id} sent successfully`);

    // NOTE: Currently using DocuSeal's native email delivery
    // Future: Implement custom notifications via Resend/Twilio for branded emails

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submissionId,
        signers_count: signatureRequest.signers.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in docuseal-send:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
