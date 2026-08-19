import { z } from "zod";

// Shared between apps/server (request validation) and apps/web (client-side
// form validation) so both sides agree on the rules without duplicating
// them — one schema, one error message, one inferred type.

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = signupSchema;
export type LoginInput = z.infer<typeof loginSchema>;
