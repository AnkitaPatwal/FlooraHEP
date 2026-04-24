declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (
    handler: (req: Request) => Promise<Response> | Response
  ) => void;
};
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): any;
}

declare module "https://deno.land/std@0.208.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response
  ): void;
}

declare module "https://deno.land/std/http/server.ts" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response
  ): void;
}

declare module "std/http/server" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response
  ): void;
}

declare module "@supabase/supabase-js" {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): any;
  export type SupabaseClient = any;
}

declare module "npm:@supabase/supabase-js@2.33.0" {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): any;
}

declare module "npm:bcryptjs@2.4.3" {
  const bcrypt: {
    hash(data: string, saltOrRounds: string | number): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
  };
  export default bcrypt;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts";
