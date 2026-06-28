import bcrypt from "bcryptjs";
import { Router } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@academia/shared";
import { requireAuth, signToken } from "../middlewares/auth.js";
import { asyncRoute } from "../utils/async-route.js";
import { prisma } from "../services/prisma.js";
import { requestPasswordReset, resetPassword } from "../services/password-reset.service.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncRoute(async (request, response) => {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { student: true }
    });

    if (!user || !user.isActive) {
      response.status(401).json({ message: "Credenciais inválidas." });
      return;
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatches) {
      response.status(401).json({ message: "Credenciais inválidas." });
      return;
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId,
      studentId: user.student?.id
    });

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        studentId: user.student?.id
      }
    });
  })
);

authRouter.post(
  "/forgot-password",
  asyncRoute(async (request, response) => {
    const data = forgotPasswordSchema.parse(request.body);
    await requestPasswordReset(data.email);
    response.json({ message: "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha." });
  })
);

authRouter.post(
  "/reset-password",
  asyncRoute(async (request, response) => {
    const data = resetPasswordSchema.parse(request.body);
    await resetPassword(data.token, data.password);
    response.json({ message: "Senha redefinida com sucesso." });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncRoute(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { id: true, name: true, email: true, role: true, organizationId: true, student: { select: { id: true } } }
    });
    response.json({ user });
  })
);
