const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Any UUID, upper or lower case. Callers that store IDs normalize them to lowercase. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
