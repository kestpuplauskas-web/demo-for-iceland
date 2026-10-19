/** Resolves which hotel (organization) a settings read/write belongs to. */
export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveOrgId(db: any, explicit?: string | null): Promise<string> {
  if (explicit) return explicit;
  const { data } = await db.rpc("default_org_id");
  return (data as string | null) ?? DEFAULT_ORG_ID;
}
