"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { signup } from "@/app/api/auth"
import { BimFreeLogo } from "@/components/layout/bim-free-logo"
import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fieldClass =
  "border-red-900/15 bg-white/50 shadow-none focus-visible:border-red-900/30 focus-visible:ring-red-900/20"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signup(email, password, name)
      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.")
      router.push("/sign-in")
    } catch (error) {
      console.error("회원가입 에러:", error)
      alert("회원가입에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LiquidGlassPageShell maxWidth="sm" centered glassClassName="mx-auto">
      <BimFreeLogo className="mb-8" size="sm" />
      <LiquidGlassSectionHeader
        eyebrow="Registration"
        title={
          <>
            Create <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">Account</span>
          </>
        }
        description="무료로 시작하세요. BIM-Free 플랫폼에 접근할 수 있습니다."
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            required
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className={fieldClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-full bg-red-950 text-xs font-black tracking-[0.25em] text-white uppercase hover:bg-black"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-red-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </LiquidGlassPageShell>
  )
}
