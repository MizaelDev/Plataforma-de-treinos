export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Ronivon Treinamentos",
  initials: process.env.NEXT_PUBLIC_APP_INITIALS ?? "RT",
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL ?? "/brand/ronivon-logo.jpeg",
  adminSubtitle: process.env.NEXT_PUBLIC_APP_ADMIN_SUBTITLE ?? "Gestão administrativa",
  studentSubtitle: process.env.NEXT_PUBLIC_APP_STUDENT_SUBTITLE ?? "Área do aluno"
};
