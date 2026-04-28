import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">Demo</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">TM</span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Get started for free. No credit card required.</p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11">
            Create account
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/sign-in" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
