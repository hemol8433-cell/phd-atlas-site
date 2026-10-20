import { createAuthContext, getAuthorizedUser } from "./auth-core.js?v=20261020-2";
const redirect = () => location.replace("./index.html");
try {
  const ctx = await createAuthContext();
  if (!ctx.configured) throw new Error("Authentication not configured");
  const user = await getAuthorizedUser(ctx);
  if (!user) { redirect(); }
  else {
    const workspace = await ctx.client.from("phd_workspace_state")
      .select("document").eq("owner_id", user.id).maybeSingle();
    if (workspace.error) throw workspace.error;
    window.__phdPrivateSession = Object.freeze({ client: ctx.client, user });
    window.__phdWorkspaceDocument = workspace.data?.document || null;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "退出登录";
    btn.style.cssText = "border:1px solid #d8dfe9;background:#fff;color:#516079;border-radius:9px;padding:9px 12px;";
    btn.addEventListener("click",async () => {
      btn.disabled = true;
      await ctx.client.auth.signOut();
      location.replace("./index.html");
    });
    document.querySelector(".header-right")?.prepend(btn);
    document.documentElement.style.visibility = "visible";
    const script = document.createElement("script");
    script.src = "./research.js?v=20261020-dayflow-w2";
    script.defer = true;
    document.body.appendChild(script);
  }
} catch (error) {
  console.warn("Private dashboard unavailable:", error.message || error);
  document.documentElement.style.visibility = "visible";
  document.body.innerHTML = '<main style="max-width:600px;margin:15vh auto;padding:30px;font:16px system-ui"><h1>无法加载私人工作台</h1><p>身份验证或受保护数据连接暂时不可用。请检查配置和数据库权限。</p><a href="./index.html">返回登录入口</a></main>';
}
