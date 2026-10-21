async function hasRole(ctx: { supabase: any; userId: string }, role: string) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: role,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  if (!(await hasRole(ctx, "admin"))) throw new Error("You do not have administrator rights.");
}

export async function assertDeveloper(ctx: { supabase: any; userId: string }) {
  if (!(await hasRole(ctx, "developer"))) throw new Error("Only a developer can perform this action.");
}

export async function isDeveloperRole(ctx: { supabase: any; userId: string }) {
  return hasRole(ctx, "developer");
}

/** Staff management: hotel administrator or developer. */
export async function assertCanManageUsers(ctx: { supabase: any; userId: string }) {
  if (await hasRole(ctx, "admin")) return;
  if (await hasRole(ctx, "developer")) return;
  throw new Error("You do not have rights to manage staff.");
}

/** Read access: administrator, developer, or viewer. */
export async function assertCanView(ctx: { supabase: any; userId: string }) {
  for (const role of ["admin", "developer", "viewer"]) {
    if (await hasRole(ctx, role)) return;
  }
  throw new Error("You do not have viewing rights.");
}
