import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string };

export function MfaCard() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
    } else {
      setFactors([...(data?.totp ?? [])] as Factor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator (${new Date().toISOString().slice(0, 10)})`,
    });
    setEnrolling(false);
    if (error || !data) {
      toast.error(error?.message ?? 'Failed to start enrollment');
      return;
    }
    setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!enrollment) return;
    setVerifying(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
    if (challenge.error || !challenge.data) {
      setVerifying(false);
      toast.error(challenge.error?.message ?? 'Challenge failed');
      return;
    }
    const verify = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setVerifying(false);
    if (verify.error) {
      toast.error(verify.error.message);
      return;
    }
    toast.success('Two-factor authentication enabled');
    setEnrollment(null);
    setCode('');
    refresh();
  };

  const cancelEnroll = async () => {
    if (enrollment) {
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    }
    setEnrollment(null);
    setCode('');
    refresh();
  };

  const removeFactor = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Two-factor authentication removed');
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {verifiedFactor ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add a time-based one-time passcode (TOTP) from an authenticator app as a second step at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : verifiedFactor ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Enabled</Badge>
              <span className="text-sm text-muted-foreground">{verifiedFactor.friendly_name || 'Authenticator app'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeFactor(verifiedFactor.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        ) : enrollment ? (
          <div className="space-y-3">
            <p className="text-sm">Scan this QR code with Google Authenticator, 1Password, Authy, or another TOTP app.</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img src={enrollment.qr} alt="MFA QR code" className="h-44 w-44 rounded-md border bg-background p-2" />
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Can't scan? Enter this key manually:</Label>
                  <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{enrollment.secret}</code>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyEnroll} disabled={verifying || code.length !== 6}>
                {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying</> : 'Verify & Enable'}
              </Button>
              <Button variant="outline" onClick={cancelEnroll} disabled={verifying}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Two-factor is currently <strong>off</strong>. Enabling it requires an authenticator app every time you sign in.
            </p>
            <Button onClick={startEnroll} disabled={enrolling}>
              {enrolling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing</> : 'Enable two-factor'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
