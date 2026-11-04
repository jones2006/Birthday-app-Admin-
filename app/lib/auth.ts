import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export async function verifyAdminSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("admin-session")?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    return false;
  }

  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (
      session.username !== process.env.ADMIN_USERNAME ||
      typeof session.exp !== "number" ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
