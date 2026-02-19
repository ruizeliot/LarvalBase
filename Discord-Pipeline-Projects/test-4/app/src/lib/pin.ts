/** Generate a random 6-digit PIN code */
export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
