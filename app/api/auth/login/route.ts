import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const adminEmail = process.env.ADMIN_USERNAME;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!supabaseUrl || !supabaseKey || !adminEmail || !sessionSecret) {
      console.error("Supabase authentication configuration missing.");

      return NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 500 },
      );
    }

    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 8;

    const payload = Buffer.from(
      JSON.stringify({
        username: data.user.email,
        exp: expiresAt,
      }),
    ).toString("base64url");

    const signature = createHmac("sha256", sessionSecret)
      .update(payload)
      .digest("base64url");

    const token = `${payload}.${signature}`;

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
    });

    response.cookies.set("admin-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Supabase login error:", error);

    return NextResponse.json(
      { error: "Unable to process login." },
      { status: 500 },
    );
  }
}
