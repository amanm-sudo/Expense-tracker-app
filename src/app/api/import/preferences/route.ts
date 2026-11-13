import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const { id } = await getAuthenticatedUser();
    const user = await db.user.findUniqueOrThrow({
      where: { id }, select: { importMode: true },
    });
    return NextResponse.json({ mode: user.importMode });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to load import settings." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await getAuthenticatedUser();
    const payload: unknown = await req.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const mode = (payload as Record<string, unknown>).mode;
    if (mode !== "trusted" && mode !== "review") {
      return NextResponse.json({ error: "Mode must be trusted or review." }, { status: 400 });
    }
    const user = await db.user.update({
      where: { id }, data: { importMode: mode }, select: { importMode: true },
    });
    return NextResponse.json({ mode: user.importMode });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save import settings." }, { status: 500 });
  }
}
