"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // 페이지 이동을 위한 훅
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react"; // User 아이콘 추가

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Developers", href: "#developers" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. 로그인 상태를 관리하는 state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 2. 컴포넌트 마운트 시 토큰 확인 (로그인 여부 체크)
    const token = localStorage.getItem("accessToken"); // 저장하신 토큰 키 이름을 넣으세요
    if (token) {
      setIsLoggedIn(true);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. 로그아웃 처리 함수
  const handleLogout = () => {
    localStorage.removeItem("accessToken"); // 토큰 삭제
    setIsLoggedIn(false);
    alert("로그아웃 되었습니다.");
    router.push("/"); // 메인으로 이동
  };

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div className={`flex items-center justify-between px-6 lg:px-8 ${isScrolled ? "h-14" : "h-20"}`}>
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <span className={`font-display tracking-tight ${isScrolled ? "text-xl" : "text-2xl"}`}>Demo</span>
            <span className="text-muted-foreground font-mono text-[10px]">TM</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-sm text-foreground/70 hover:text-foreground">
                {link.name}
              </a>
            ))}
          </div>

          {/* 4. 로그인 상태에 따른 조건부 렌더링 (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <button
                  onClick={handleLogout}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  Logout
                </button>
                <Button size="sm" className="rounded-full bg-secondary text-foreground">
                  <User className="w-4 h-4 mr-2" />
                  My Page
                </Button>
              </>
            ) : (
              <>
                <a href="/sign-in" className="text-sm text-foreground/70 hover:text-foreground">
                  Sign in
                </a>
                <Button size="sm" asChild className="bg-foreground text-background rounded-full px-6">
                  <a href="/sign-up">Sign up</a>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay (생략 - 내부 버튼에도 isLoggedIn 조건 동일하게 적용 가능) */}
    </header>
  );
}