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
  const { data, error } = await ctx.client.auth.getUser();
  if (error || !data?.user) return null;
  let identities = data.user.identities || [];
  if (typeof ctx.client.auth.getUserIdentities === "function") {
    const fresh = await ctx.client.auth.getUserIdentities();
    if (!fresh.error && Array.isArray(fresh.data?.identities)) identities = fresh.data.identities;
  }
  const allowed = identities.some(identity =>
    identity.provider === "github" &&
    String(identity.provider_id) === String(ctx.config.allowedGithubUserId)
  );
  if (!allowed) return null;
  return data.user;
}
