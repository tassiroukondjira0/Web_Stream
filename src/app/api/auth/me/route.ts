import { NextResponse } from "next/server";
import { COOKIE_NAME, getCurrentUser } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnecté avec succès." });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const user = await getCurrentUser(bearer);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
