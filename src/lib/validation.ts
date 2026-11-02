import { z } from "zod";

export const schoolIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{5,12}$/, "School ID must be 5-12 letters/numbers");

export const emailSchema = z
  .string()
  .trim()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address");

export const passwordSchema = z.string().min(1, "Password is required");

export const studentLoginSchema = z.object({
  schoolIdNo: schoolIdSchema,
  password: passwordSchema,
});

export const facultyLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
export type FacultyLoginInput = z.infer<typeof facultyLoginSchema>;
