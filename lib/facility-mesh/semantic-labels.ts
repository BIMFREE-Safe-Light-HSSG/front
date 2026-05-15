export const GLASS_STRUCTURE_SEMANTICS = [0, 1, 2] as const

export const STRUCTURE_GLASS_STYLE: Record<
  number,
  { name: string; color: [number, number, number]; opacity: number }
> = {
  0: { name: "Ceiling", color: [255, 80, 80], opacity: 0.52 },
  1: { name: "Floor", color: [80, 220, 120], opacity: 0.58 },
  2: { name: "Wall", color: [80, 120, 255], opacity: 0.5 },
}
