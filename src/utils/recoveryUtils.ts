export function generateRecoveryCode(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}

export function getExpiresAt(hours: number): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}
