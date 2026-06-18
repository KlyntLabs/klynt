export const routePaths = {
  home: "/",
  register: "/register",
  registerSuccess: "/register/success",
  dashboard: "/dashboard",
  courses: "/courses",
  course: (id: string) => `/courses/${id}`,
  lesson: (id: string) => `/lessons/${id}`,
  assignments: "/assignments",
  admin: "/admin",
  settings: "/settings",
} as const;
