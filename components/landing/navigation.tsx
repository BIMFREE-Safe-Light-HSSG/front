"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Upload", href: "/upload" },
  { name: "Viewer", href: "/viewer" },
  { name: "Developers(🚧developing🚧)", href: "#developers" },
];

const protectedLinks = ["Upload", "Viewer"];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const displayLinks = navLinks.filter((link) => {
    if (link.name === "Features" && !isHomePage) return false;
    return true;
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) setIsLoggedIn(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

  const handleNavClick = (e: React.MouseEvent, link: { name: string; href: string }) => {
    if (protectedLinks.includes(link.name)) {
      e.preventDefault();
      if (!isLoggedIn) {
        alert("로그인이 필요한 서비스입니다.");
        router.push("/sign-in");
      } else {
        router.push(link.href);
      }
      return;
    }

    if (link.href.startsWith("#")) {
      e.preventDefault();
      const targetId = link.href.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        const offset = isScrolled ? 80 : 100;
        const elementPosition = elem.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed z-50 transition-all duration-700 ease-in-out ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-700 ease-in-out relative
          ${isScrolled || isMobileMenuOpen
            ? "max-w-[1200px] rounded-[32px] shadow-[0_20px_40px_rgba(153,27,27,0.1)]"
            : "max-w-[1400px] rounded-none"
          }
          /* Liquid Glass 테마 색상 적용: 투명한 아이보리 레드 */
          bg-white/40 backdrop-blur-[24px] 
          border border-red-900/10 
          overflow-hidden
        `}
      >
        {/* 상단 빛 반사 효과 (레드 틴트 추가) */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 to-transparent pointer-events-none" />

        <div className={`relative z-10 flex items-center justify-between px-10 transition-all duration-500 ${isScrolled ? "h-16" : "h-24"}`}>

          {/* Logo Section */}
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="flex flex-col justify-center leading-none">
              <span className={`font-display font-bold tracking-tight transition-all duration-500 ${
                isScrolled ? "text-lg" : "text-2xl"
              } text-zinc-900 group-hover:text-red-600`}>
                BIM-Free
              </span>
              <div className="flex items-start">
                <span className={`font-display tracking-tighter opacity-60 transition-all duration-500 ${
                  isScrolled ? "text-[10px]" : "text-[12px]"
                } text-red-900`}>
                  Safe(Light)HSSG
                </span>
                <Gem size={8} className="ml-1 mt-0.5 text-red-600 opacity-40" />
              </div>
            </div>
          </a>

          {/* Desktop Navigation - 레드 다이아몬드 스타일 탭 */}
          <div className="hidden md:flex items-center bg-red-950/5 rounded-full p-1 border border-red-900/5">
            {displayLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                onMouseEnter={() => setHoveredTab(link.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className="relative px-6 py-2 text-[13px] font-bold text-zinc-500 hover:text-red-950 transition-colors uppercase tracking-tight"
              >
                {hoveredTab === link.name && (
                  <motion.div
                    layoutId="nav-hover"
                    className="absolute inset-0 bg-white shadow-sm rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
              </a>
            ))}
          </div>

          {/* User Auth Buttons - 레드 다이아몬드 포인트 컬러 */}
          <div className="hidden md:flex items-center gap-8">
            {isLoggedIn ? (
              <>
                <button
                  onClick={handleLogout}
                  className="text-xs text-zinc-400 hover:text-red-600 transition-colors font-bold uppercase tracking-widest"
                >
                  Logout
                </button>
                <Button size="sm" className="rounded-full bg-red-950 text-white px-6 h-10 hover:bg-black shadow-lg transition-all active:scale-95 border-none">
                  <User className="w-4 h-4 mr-2" />
                  My Page
                </Button>
              </>
            ) : (
              <>
                <a href="/sign-in" className="text-xs text-zinc-400 hover:text-red-600 font-bold transition-colors uppercase tracking-widest">
                  Sign in
                </a>
                <Button size="sm" asChild className="bg-white/60 backdrop-blur-md text-red-950 border border-red-900/20 rounded-full px-8 h-11 hover:bg-red-50 shadow-sm transition-all active:scale-95">
                  <a href="/sign-up">Sign up</a>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-3 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors text-red-900"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu - 레드 톤 강화 */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-red-900/10 overflow-hidden bg-white/80"
            >
              <div className="p-10 flex flex-col gap-6">
                {displayLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => {
                      handleNavClick(e, link);
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-2xl font-black text-zinc-900 hover:text-red-600 transition-colors tracking-tighter uppercase"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}