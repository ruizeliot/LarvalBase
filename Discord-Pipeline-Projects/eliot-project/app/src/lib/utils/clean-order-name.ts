/**
 * Clean an order name by removing "incertae sedis" suffix.
 * E.g., "Perciformes incertae sedis" → "Perciformes"
 */
export function cleanOrderName(order: string): string {
  if (!order) return order;
  return order.replace(/\s+incertae\s+sedis$/i, '');
}
