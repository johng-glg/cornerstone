import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
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
import { Scale, Mail, ArrowLeft } from 'lucide-react';

const schema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255),
});

type FormData = z.infer<typeof schema>;

/**
 * Public page that lets a staff member request a password reset link.
 * Sends a Supabase recovery email that lands them on /reset-password.
 *
 * NOTE: For security we always show the same success message regardless
 * of whether the email matches a real account, to avoid account enumeration.
 */
export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await requestPasswordReset(data.email);
      if (error) {
        // Still show generic success to avoid enumeration; log for ops only.
        console.error('Password reset request error:', error.message);
      }
      setSubmitted(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter your work email and we'll send you a link to set a new password.
            </CardDescription>
          </CardHeader>
          {submitted ? (
            <>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If an account exists for that email, a reset link is on its way.
                  Check your inbox (and spam folder). The link expires in 1 hour.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Link>
                </Button>
              </CardFooter>
            </>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/auth">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
