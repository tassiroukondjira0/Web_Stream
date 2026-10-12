import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Déconnecté avec succès." });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
