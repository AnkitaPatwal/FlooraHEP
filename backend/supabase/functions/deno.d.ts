declare global {
  const Deno: {
    env: { get(key: string): string | undefined };
  };
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): Record<string, unknown>;
}

declare module "https://deno.land/std@0.208.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response
  ): void;
}

export {};
