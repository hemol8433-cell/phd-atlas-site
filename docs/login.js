import { createAuthContext, getAuthorizedUser } from "./auth-core.js?v=20261020-2";
const loginButton = document.getElementById("githubLogin");
const message = document.getElementById("authMessage");

loginButton.disabled = true;
try {
  const ctx = await createAuthContext();
  if (!ctx.configured) {
    message.textContent = "网站身份验证服务尚未配置，暂时无法登录。";
  } else {
    // No session is the normal state for a first-time visitor.
    // Never call getUser() for a logged-out visitor.
    const { data, error } = await ctx.client.auth.getSession();
    if (error) throw error;
    if (data?.session) {
      const user = await getAuthorizedUser(ctx);
      if (user) {
        location.replace("./app.html");
      } else {
        message.textContent = "当前登录账号不在授权名单中，请使用工作台主人的 GitHub 账号。";
        await ctx.client.auth.signOut({ scope: "local" });
        loginButton.disabled = false;
      }
    } else {
      message.textContent = "科研数据、文献推荐与个人笔记仅对授权账号开放。";
      loginButton.disabled = false;
    }
    loginButton.addEventListener("click", async () => {
      if (loginButton.disabled) return;
      loginButton.disabled = true;
      message.textContent = "正在跳转到 GitHub 身份验证…";
      try {
        const redirectTo = new URL("./index.html", location.href).href;
        const { error } = await ctx.client.auth.signInWithOAuth({
          provider: "github",
          options: { redirectTo, scopes: "read:user" }
        });
        if (error) throw error;
        // signInWithOAuth usually redirects automatically. If it does not,
        // keep the interface actionable instead of permanently disabled.
        loginButton.disabled = false;
        message.textContent = "如果没有自动跳转，请重试登录。";
      } catch (error) {
        message.textContent = "登录请求失败：" + String(error.message || error);
        loginButton.disabled = false;
      }
    });
  }
} catch (error) {
  message.textContent = "登录初始化失败：" + String(error.message || error) + "。请刷新页面重试。";
  loginButton.disabled = false;
}
