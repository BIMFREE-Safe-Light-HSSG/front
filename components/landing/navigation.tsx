"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Flame } from "lucide-react";
import { DarkModeToggle } from "../ui/darkmode-toggle";

// 네비게이션 링크 설정
const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Upload", href: "/upload" }, // 명칭 및 경로 수정
  { name: "Viewer", href: "/viewer" }, // 로그인 필요
  { name: "Developers(🚧developing🚧)", href: "#developers" },
];

// 로그인이 필요한 탭 목록 (탭 이름과 일치해야 함)
const protectedLinks = ["Upload", "Viewer"];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);

    const token = localStorage.getItem("accessToken");
    if (token) {
      setIsLoggedIn(true);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentTheme = isMounted ? (resolvedTheme ?? "light") : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

  const handleNavClick = (
    e: React.MouseEvent,
    link: { name: string; href: string },
  ) => {
    if (protectedLinks.includes(link.name)) {
      e.preventDefault();

      if (!isLoggedIn) {
        alert("로그인이 필요한 서비스입니다.");
        router.push("/sign-in");
      } else {
        router.push(link.href); // 현재 탭에서 이동
      }
    }
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
        <div
          className={`flex items-center justify-between px-6 lg:px-8 ${isScrolled ? "h-14" : "h-20"}`}
        >
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <span
              className={`font-display tracking-tight ${isScrolled ? "text-xl" : "text-2xl"}`}
            >
              Demo
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              TM
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="text-sm text-foreground/70 hover:text-foreground cursor-pointer transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <DarkModeToggle />
          </div>

          {/* User Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <button
                  onClick={handleLogout}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  Logout
                </button>
                <Button
                  size="sm"
                  className="rounded-full bg-secondary text-foreground"
                >
                  <User className="w-4 h-4 mr-2" />
                  My Page
                </Button>
              </>
            ) : (
              <>
                <a
                  href="/sign-in"
                  className="text-sm text-foreground/70 hover:text-foreground"
                >
                  Sign in
                </a>
                <Button
                  size="sm"
                  asChild
                  className="bg-foreground text-background rounded-full px-6"
                >
                  <a href="/sign-up">Sign up</a>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-foreground/10 p-6 flex flex-col gap-4 bg-background/95">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  handleNavClick(e, link);
                  setIsMobileMenuOpen(false);
                }}
                className="text-lg font-medium"
              >
                {link.name}
              </a>
            ))}
            <DarkModeToggle />
          </div>
        )}
      </nav>
    </header>
  );
}
