import type { Config, Context } from "@netlify/functions";
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  createAdminToken,
  verifyAdminToken,
  timingSafeCompare,
  getClientIp,
  SECURITY_HEADERS,
} from "./utils/security.js";
import { logAudit, ensureInitialized } from "./utils/db-service.js";

export default async (req: Request, context: Context) => {
  const clientIp = getClientIp(req, context);
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    await ensureInitialized();

    const url = new URL(req.url);

    // 1. Verify token endpoint (GET /api/admin/verify or GET /api/admin/auth)
    if (req.method === "GET") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "") || "";
      const session = verifyAdminToken(token);

      if (!session) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: SECURITY_HEADERS,
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          username: session.username,
          role: session.role,
          expiresAt: new Date(session.exp * 1000).toISOString(),
        }),
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // 2. Admin Login (POST /api/admin/login)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();

      const isUsernameCorrect = timingSafeCompare(username, ADMIN_USERNAME);
      const isPasswordCorrect = timingSafeCompare(password, ADMIN_PASSWORD);

      if (!isUsernameCorrect || !isPasswordCorrect) {
        await logAudit({
          ip: clientIp,
          action: "ADMIN_LOGIN",
          target: username || "unknown",
          status: "FAILED_PASSWORD",
          details: "Failed admin login attempt",
          userAgent,
        });

        return new Response(
          JSON.stringify({
            ok: false,
            message: "管理员账号或密码错误",
          }),
          { status: 401, headers: SECURITY_HEADERS }
        );
      }

      // Successful login
      const token = createAdminToken(username);
      await logAudit({
        ip: clientIp,
        action: "ADMIN_LOGIN",
        target: username,
        status: "SUCCESS",
        details: "Administrator logged in successfully",
        userAgent,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          token,
          username,
          role: "admin",
          message: "管理员登录成功",
        }),
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: SECURITY_HEADERS,
    });
  } catch (err: any) {
    console.error("Admin auth error:", err);
    return new Response(
      JSON.stringify({ ok: false, message: "认证服务异常" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

export const config: Config = {
  path: ["/api/admin/login", "/api/admin/verify", "/api/admin/auth"],
};
