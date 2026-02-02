import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Scale, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Invalid email or password. Please try again.',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            variant: 'destructive',
            title: 'Email Not Verified',
            description: 'Please check your email and verify your account before logging in.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: error.message,
          });
        }
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/');
      }
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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-primary p-4 rounded-xl">
              <Scale className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-heading font-black text-secondary-foreground mb-4 uppercase tracking-wide">
            Guardian Litigation Group
          </h1>
          <p className="text-secondary-foreground/80 text-lg">
            Protecting consumers and fighting for your financial freedom
          </p>
          <div className="mt-12 flex items-center justify-center gap-3 text-secondary-foreground/60">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Secure & Confidential</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
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
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••••••"
                      className="pl-10"
                      {...loginForm.register('password')}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Contact your administrator if you need an account or forgot your password.
                </p>
              </CardFooter>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            By continuing, you agree to Guardian Litigation Group's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
