"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ViewerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Viewer Area</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="h-40 bg-secondary rounded-xl animate-pulse" />
        <div className="h-40 bg-secondary rounded-xl animate-pulse" />
        <div className="h-40 bg-secondary rounded-xl animate-pulse" />
      </div>
    </main>
  );
}