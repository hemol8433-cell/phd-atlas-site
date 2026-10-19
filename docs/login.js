import { createAuthContext, getAuthorizedUser } from "./auth-core.js";
const loginButton = document.getElementById("githubLogin");
const message = document.getElementById("authMessage");
loginButton.disabled = true;
try {
  const ctx = await createAuthContext();
  if (!ctx.configured) {
    message.textContent = "站点尚未配置身份验证服务。管理员完成 Supabase 配置后即可使用 GitHub 登录。";
  } else {
    const user = await getAuthorizedUser(ctx);
    if (user) {
      location.replace("./app.html");
    } else {
      const existing = await ctx.client.auth.getUser();
      if (existing.data?.user) {
        message.textContent = "当前 GitHub 身份不在授权名单中。仅工作台主人可以进入。";
        await ctx.client.auth.signOut({ scope: "local" });
      } else {
        message.textContent = "科研数据、文献推荐和个人笔记仅对授权账号开放。";
      }
      loginButton.disabled = false;
      loginButton.addEventListener("click", async () => {
        loginButton.disabled = true;
        message.textContent = "正在跳转到 GitHub 身份验证…";
        const redirectTo = new URL("./index.html", location.href).href;
        const { error } = await ctx.client.auth.signInWithOAuth({
          provider: "github",
          options: { redirectTo, scopes: "read:user" }
        });
        if (error) { message.textContent = error.message; loginButton.disabled = false; }
      });
    }
  }
} catch (error) {
  message.textContent = "认证服务不可用：" + String(error.message || error);
}
