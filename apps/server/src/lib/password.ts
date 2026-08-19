// Password hashing via Bun's built-in Bun.password (argon2id by default) —
// no need for a separate bcrypt/argon2 npm dependency under the Bun runtime.

export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash);
}
