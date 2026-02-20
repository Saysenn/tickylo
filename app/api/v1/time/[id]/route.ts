import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ok, errorResponse } from "@/lib/response";
import { z } from "zod";

const stopSchema = z.object({
  title:       z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

// PATCH /api/v1/time/:id — stop the timer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    // Verify ownership
    const entry = await prisma.timeEntry.findFirst({
      where: { id, user_id: user.id, end_time: null },
    });
    if (!entry) return errorResponse("Active entry not found", 404);

    const body     = await request.json().catch(() => ({}));
    const validated = stopSchema.safeParse(body);
    if (!validated.success) {
      return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data:  {
        end_time:    new Date(),
        title:       validated.data.title,
        description: validated.data.description,
      },
    });

    return ok(updated);
  } catch (err) {
    console.error("[time/:id:PATCH]", err);
    return errorResponse("Internal server error", 500);
  }
}
