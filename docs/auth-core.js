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

  // A brand-new visitor is expected to have no session. Never treat this as
  // an authentication-service failure or disable the sign-in button.
  const { data: sessionData, error: sessionError } = await ctx.client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData?.session) return null;

  // Verify the session remotely (getSession alone does not verify identity).
  const { data, error } = await ctx.client.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" ||
        /auth session missing/i.test(error.message || "")) return null;
    throw error;
  }
  if (!data?.user) return null;

  // Server-side RLS is authoritative, not optional GitHub metadata returned
  // by the browser SDK. The seeded row is only visible to the one approved
  // GitHub ID under private.is_phd_atlas_owner().
  const check = await ctx.client.from("phd_private_papers")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  if (check.error) throw check.error;
  return check.data?.id === 1 ? data.user : null;
}
