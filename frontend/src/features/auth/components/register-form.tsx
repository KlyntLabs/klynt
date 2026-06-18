import { type RegisterResponse, register } from "@/features/auth/api/register";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    role: z.enum(["student", "teacher", "admin", "parent"]),
    institutionId: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().uuid().optional()
    ),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms" }),
    }),
    termsVersion: z.string(),
  })
  .refine(
    (data) =>
      !(data.role === "teacher" || data.role === "admin") ||
      (data.institutionId !== undefined && data.institutionId !== ""),
    {
      message: "Institution is required for this role",
      path: ["institutionId"],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "student",
      termsAccepted: false,
      termsVersion: "2026-06-18",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      const response = await register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        institutionId: data.institutionId,
        termsAccepted: data.termsAccepted,
        termsVersion: data.termsVersion,
      });
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" {...registerField("name")} className="w-full border p-2" />
          {errors.name && <p className="text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            {...registerField("email")}
            className="w-full border p-2"
          />
          {errors.email && <p className="text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...registerField("password")}
            className="w-full border p-2"
          />
          {errors.password && <p className="text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select id="role" {...registerField("role")} className="w-full border p-2">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="parent">Parent</option>
          </select>
          {errors.role && <p className="text-red-600">{errors.role.message}</p>}
        </div>
        <div>
          <label htmlFor="institutionId">Institution ID</label>
          <input
            id="institutionId"
            {...registerField("institutionId")}
            className="w-full border p-2"
          />
          {errors.institutionId && <p className="text-red-600">{errors.institutionId.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input id="termsAccepted" type="checkbox" {...registerField("termsAccepted")} />
          <label htmlFor="termsAccepted">I accept the terms and conditions</label>
        </div>
        {errors.termsAccepted && <p className="text-red-600">{errors.termsAccepted.message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {isSubmitting ? "Registering..." : "Register"}
        </button>
      </form>
      {error && <p className="text-red-600 mt-4">{error}</p>}
      {result && (
        <pre className="mt-4 bg-gray-100 p-4 rounded text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
