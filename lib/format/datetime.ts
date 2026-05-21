export function formatViewerDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
