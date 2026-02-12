type AuditMeta = {
  updatedAt: string;
  updatedBy: string | null;
};

export function buildAuditMeta(updatedBy: string | null): AuditMeta {
  return {
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}
