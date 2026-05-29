import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-4 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist.</p>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </main>
  );
}
