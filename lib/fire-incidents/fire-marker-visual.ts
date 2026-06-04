import * as THREE from "three";

export const FIRE_SEVERITY_COLOR = {
  low: {
    hot: "#fffbeb",
    mid: "#fde047",
    base: "#f59e0b",
    ring: "#fde68a",
    glow: "#fbbf24",
  },
  medium: {
    hot: "#fff7ed",
    mid: "#fdba74",
    base: "#f97316",
    ring: "#fdba74",
    glow: "#fb923c",
  },
  high: {
    hot: "#fef2f2",
    mid: "#fca5a5",
    base: "#ef4444",
    ring: "#fca5a5",
    glow: "#f87171",
  },
} as const;

export type FireFlamePalette =
  (typeof FIRE_SEVERITY_COLOR)[keyof typeof FIRE_SEVERITY_COLOR];

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getFireFlameTexture(
  palette: FireFlamePalette,
  variant: "outer" | "core" = "outer",
): THREE.CanvasTexture {
  const key = `${palette.base}-${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Texture() as THREE.CanvasTexture;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = 64;
  const baseY = 238;
  const tipY = variant === "core" ? 72 : 48;
  const gradient = ctx.createLinearGradient(cx, baseY, cx, tipY);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.12, palette.base);
  gradient.addColorStop(0.45, palette.mid);
  gradient.addColorStop(0.82, palette.hot);
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  const wobble = variant === "core" ? 26 : 38;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.bezierCurveTo(cx - wobble, baseY - 70, cx - wobble * 0.55, tipY + 40, cx, tipY);
  ctx.bezierCurveTo(cx + wobble * 0.55, tipY + 40, cx + wobble, baseY - 70, cx, baseY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export const FIRE_PICK_SPHERE = new THREE.SphereGeometry(0.85, 8, 8);

export const FIRE_BILLBOARD_PLANE = new THREE.PlaneGeometry(1.15, 1.75);
