const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export async function createAuthContext() {
  const config = window.PHD_ATLAS_CONFIG || {};
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    return { configured: false, config };
  }
  if (!/^https:\/\/[-a-zA-Z0-9.]+\.supabase\.co\/?$/.test(config.supabaseUrl)) {
    throw new Error("Supabase 项目地址无效，请检查配置。");
  }
  const { createClient } = await import(SDK_URL);
  const client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  });
  return { configured: true, config, client };
}

export async function getAuthorizedUser(ctx) {
  if (!ctx.configured) return null;
  // Auth verifies the access token with Supabase, not just the cached browser state.
  const { data, error } = await ctx.client.auth.getUser();
  if (error) throw error;
  if (!data?.user) return null;

  // Authorize with a server-side RLS decision, not an optional identity field
  // in the browser SDK. The feed row is seeded and its SELECT policy grants
  // access only when auth.identities contains the fixed GitHub account ID.
  const check = await ctx.client.from("phd_private_papers")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  if (check.error) throw check.error;
  return check.data?.id === 1 ? data.user : null;
}
