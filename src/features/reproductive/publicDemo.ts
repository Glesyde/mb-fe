// Public demo route for judges: /repro-demo, outside the login, only when VITE_REPRO_PUBLIC_DEMO=true.
// With the flag off, /repro-demo falls through to normal routing (and so to the login page).

const PUBLIC_DEMO_PATH = "/repro-demo";

export function isPublicDemoRoute(pathname: string, flag: unknown): boolean {
  return flag === "true" && pathname.replace(/\/+$/, "") === PUBLIC_DEMO_PATH;
}

export function publicDemoFlag(): unknown {
  return (import.meta as any).env?.VITE_REPRO_PUBLIC_DEMO;
}
