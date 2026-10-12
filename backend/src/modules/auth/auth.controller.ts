import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

// ── POST /api/auth/login ────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          active: user.active,
          phone: user.phone,
          department: user.department,
          period: user.period,
          initials: user.initials,
          degree: user.degree,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ── POST /api/auth/register ─────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, phone, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: 'El email ya está registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        department,
        phone,
        initials,
        role: (role as Role) || Role.DOCENTE,
      },
    });

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          initials: user.initials,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ── POST /api/auth/refresh ──────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Refresh token requerido' });
      return;
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; role: string };
    const { accessToken, refreshToken: newRefresh } = signTokens(decoded.userId, decoded.role);

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh token inválido o expirado' });
  }
};
