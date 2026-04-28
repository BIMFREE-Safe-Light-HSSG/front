import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">Demo</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">TM</span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
        </div>

        {/* Form */}
        <form className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11">
            Sign in
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
