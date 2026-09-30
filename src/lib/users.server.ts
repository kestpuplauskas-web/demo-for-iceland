export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You do not have administrator rights.");
}

export async function assertDeveloper(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "developer",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only a developer can perform this action.");
}

/** Read access: administrator, developer, or viewer. */
export async function assertCanView(ctx: { supabase: any; userId: string }) {
  const roles = ["admin", "developer", "viewer"] as const;
  for (const role of roles) {
    const { data, error } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: role,
    });
    if (error) throw new Error(error.message);
    if (data) return;
  }
  throw new Error("You do not have viewing rights.");
}
