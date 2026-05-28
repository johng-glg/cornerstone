import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_RECOVERY_STORAGE_KEY, useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Scale, Lock } from 'lucide-react';

// Password policy: 12+ chars per project security standards memory.
const schema = z
  .object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

/**
 * Public page reached via the password-recovery email.
 * Supabase puts the user into a recovery session automatically when the link
 * is opened; we just need to verify that recovery context exists and then
 * call updateUser({ password }).
 *
 * If the user lands here without a recovery session (e.g. expired link),
 * we redirect them back to /forgot-password.
 */
export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const timers: number[] = [];
    const markReady = () => isMounted && setHasRecoverySession(true);
    const markExpired = () => isMounted && setHasRecoverySession(false);

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const searchParams = url.searchParams;
      const storedRecovery = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const code = searchParams.get('code');
    const linkType = hashParams.get('type') ?? searchParams.get('type');
    const looksLikeRecoveryLink =
        storedRecovery ||
      linkType === 'recovery' ||
      Boolean(accessToken) ||
      Boolean(refreshToken) ||
      Boolean(code);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && looksLikeRecoveryLink)) {
        markReady();
      }
    });

    const hydrateRecoverySession = async () => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session && looksLikeRecoveryLink) {
        markReady();
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          markReady();
          return;
        }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          markReady();
          return;
        }
      }

      if (!looksLikeRecoveryLink) {
        markExpired();
        return;
      }

      // The auth client may still be consuming the recovery URL. Poll briefly
      // before calling the link expired; the provider also listens above.
      let attempts = 0;
      const poll = window.setInterval(async () => {
        attempts += 1;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.clearInterval(poll);
          markReady();
        } else if (attempts >= 12) {
          window.clearInterval(poll);
          markExpired();
        }
      }, 500);
      timers.push(poll);
    };

    hydrateRecoverySession();

    return () => {
      isMounted = false;
      timers.forEach((timer) => window.clearInterval(timer));
      subscription.unsubscribe();
    };
  }, []);

  const form = useForm<FormData>({

    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await updatePassword(data.password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Could not update password',
          description: error.message,
        });
        return;
      }
      toast({
        title: 'Password updated',
        description: 'Please sign in with your new password.',
      });
      // Force a clean sign-in cycle.
      sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      await signOut();
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Preparing Reset</CardTitle>
            <CardDescription>
              Verifying your password reset link…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (hasRecoverySession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/forgot-password')}>
              Request a New Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary p-3 rounded-xl">
              <Scale className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-heading font-black text-foreground uppercase">
            Guardian Litigation
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set a New Password</CardTitle>
            <CardDescription>
              Minimum 12 characters, with upper- and lower-case letters and a number.
            </CardDescription>
          </CardHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    className="pl-10"
                    {...form.register('password')}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    className="pl-10"
                    {...form.register('confirm')}
                  />
                </div>
                {form.formState.errors.confirm && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirm.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading || !hasRecoverySession}>
                {isLoading ? 'Updating…' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
