import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

// PATCH /api/user — update the authenticated user's display name
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { email: session.user.email },
      data: { name: name.trim() },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error("[PATCH /api/user] error:", err);
    return NextResponse.json({ error: "Failed to update name." }, { status: 500 });
  }
}

// GET /api/user — get the current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await db.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error("[GET /api/user] error:", err);
    return NextResponse.json({ error: "Failed to load user." }, { status: 500 });
  }
}
