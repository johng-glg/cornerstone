import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * TOTP MFA opt-in. Enrolls a factor (rendering the QR + secret), then verifies a code to
 * activate it. Uses Supabase Auth MFA APIs. This is opt-in per the seed; mandatory enforcement
 * is a later policy decision.
 */
export function MfaCard() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const beginEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not start MFA enrollment.");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
  };

  const verify = async () => {
    if (!factorId) return;
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setBusy(false);
      toast.error(challenge.error?.message ?? "Could not create MFA challenge.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-factor authentication enabled.");
    setFactorId(null);
    setQr(null);
    setSecret(null);
    setCode("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Two-factor authentication</CardTitle>
        <CardDescription>
          Add an authenticator app (TOTP) for extra account security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!factorId ? (
          <Button onClick={beginEnroll} disabled={busy}>
            Enable 2FA
          </Button>
        ) : (
          <div className="space-y-3">
            {qr && (
              // QR is an SVG data URI from Supabase.
              <img
                src={qr}
                alt="Scan this QR code with your authenticator app"
                className="h-44 w-44"
              />
            )}
            {secret && (
              <p className="text-xs text-muted-foreground">
                Or enter this secret manually: <span className="font-mono">{secret}</span>
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <Button onClick={verify} disabled={busy || code.length < 6}>
              Verify &amp; activate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
