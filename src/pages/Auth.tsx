import { useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

type Mode = "signin" | "signup";

// When VITE_AUTH_GOOGLE_ONLY is set, hide the email/password form and only
// offer Google sign-in (e.g. deployments locked to a Google Workspace domain).
const googleOnly = import.meta.env.VITE_AUTH_GOOGLE_ONLY === "true";

export default function Auth() {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password, firstName, lastName);
      if (error) {
        toast.error(error.message);
      } else if (mode === "signup") {
        toast.success("Check your email to confirm your account.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    }
    // On success the browser is redirected to Google; no further action here.
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img
            src="/brand/cornerstone-logo.svg"
            alt="Cornerstone"
            className="mb-2 h-32 w-auto select-none"
            draggable={false}
          />
          <CardDescription>
            {googleOnly
              ? "Sign in with your Guardian Litigation Group account"
              : mode === "signin"
                ? "Sign in to your account"
                : "Create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            Continue with Google
          </Button>

          {!googleOnly && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          {!googleOnly && (
            <form className="space-y-3" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
            </form>
          )}
        </CardContent>
        {!googleOnly && (
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {mode === "signin" ? (
              <>
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Need an account? Sign up
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => setMode("signin")}
              >
                Already have an account? Sign in
              </button>
            )}
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
