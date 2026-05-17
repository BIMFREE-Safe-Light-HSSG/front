"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { signin } from "@/app/api/auth"
import { BimFreeLogo } from "@/components/layout/bim-free-logo"
import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fieldClass =
  "border-red-900/15 bg-white/50 text-zinc-900 placeholder:text-zinc-500 shadow-none focus-visible:border-red-900/30 focus-visible:ring-red-900/20 dark:text-zinc-900 dark:placeholder:text-zinc-500"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signin(email, password)

      if (result?.access_token) {
        localStorage.setItem("accessToken", result.access_token)
      }
      if (result?.user) {
        localStorage.setItem("currentUser", JSON.stringify(result.user))
      }
      window.dispatchEvent(new Event("auth-state-changed"))

      router.push("/viewer")
    } catch (error) {
      console.error("로그인 에러:", error)
      alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LiquidGlassPageShell maxWidth="sm" centered glassClassName="mx-auto">
      <BimFreeLogo className="mb-8" size="sm" />
      <LiquidGlassSectionHeader
        eyebrow="Access Control"
        title={
          <>
            Welcome <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">Back</span>
          </>
        }
        description="계정으로 로그인해 업로드·뷰어 기능을 이용하세요."
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
              Password
            </Label>
            <span className="text-muted-foreground text-xs">Forgot password?</span>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
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
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-red-900 underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </LiquidGlassPageShell>
  )
}
