import crypto from 'crypto';
import { logger } from '../utils/logger';

interface AuthToken {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthUser {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  role: 'admin' | 'operator';
  active: boolean;
  createdAt: number;
  lastLogin?: number;
}

class AuthService {
  private tokens: Map<string, AuthToken> = new Map();
  private users: Map<string, AuthUser> = new Map();
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private loginAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  constructor() {
    this.initializeDefaultAdmin();
  }

  private initializeDefaultAdmin(): void {
    // Create default admin user from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || this.generateSecurePassword();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@agentic-ecommerce.local';

    const adminId = 'admin-default';
    const passwordHash = this.hashPassword(adminPassword);

    this.users.set(adminId, {
      id: adminId,
      username: 'admin',
      passwordHash,
      email: adminEmail,
      role: 'admin',
      active: true,
      createdAt: Date.now(),
    });

    logger.info(`🔐 Default admin user initialized`);
    logger.info(`   Email: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      logger.warn(`   Default password: ${adminPassword}`);
      logger.warn(`   ⚠️  CHANGE THIS IMMEDIATELY in production!`);
      logger.warn(`   Set ADMIN_PASSWORD environment variable`);
    }
  }

  private hashPassword(password: string): string {
    return crypto
      .createHash('sha256')
      .update(password + process.env.PASSWORD_SALT || 'default-salt')
      .digest('hex');
  }

  private generateSecurePassword(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private isAccountLocked(username: string): boolean {
    const attempt = this.loginAttempts.get(username);
    if (!attempt) return false;

    if (Date.now() > attempt.lockedUntil) {
      this.loginAttempts.delete(username);
      return false;
    }

    return true;
  }

  private recordFailedAttempt(username: string): void {
    const attempt = this.loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
    attempt.count++;

    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
      logger.warn(`🔒 Account locked after ${this.MAX_LOGIN_ATTEMPTS} failed attempts: ${username}`);
    }

    this.loginAttempts.set(username, attempt);
  }

  private clearFailedAttempts(username: string): void {
    this.loginAttempts.delete(username);
  }

  login(username: string, password: string): AuthToken | null {
    // Check if account is locked
    if (this.isAccountLocked(username)) {
      logger.warn(`❌ Login attempt on locked account: ${username}`);
      return null;
    }

    // Find user
    let user: AuthUser | undefined;
    for (const u of this.users.values()) {
      if (u.username === username && u.active) {
        user = u;
        break;
      }
    }

    if (!user) {
      logger.warn(`❌ Login failed - user not found: ${username}`);
      this.recordFailedAttempt(username);
      return null;
    }

    // Verify password
    const passwordHash = this.hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      logger.warn(`❌ Login failed - invalid password: ${username}`);
      this.recordFailedAttempt(username);
      return null;
    }

    // Clear failed attempts
    this.clearFailedAttempts(username);

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const authToken: AuthToken = {
      token,
      userId: user.id,
      createdAt: now,
      expiresAt: now + this.TOKEN_EXPIRY,
    };

    this.tokens.set(token, authToken);

    // Update last login
    user.lastLogin = now;

    logger.info(`✅ User logged in: ${username}`);
    return authToken;
  }

  logout(token: string): boolean {
    return this.tokens.delete(token);
  }

  verifyToken(token: string): AuthUser | null {
    const authToken = this.tokens.get(token);

    if (!authToken) {
      return null;
    }

    // Check if expired
    if (Date.now() > authToken.expiresAt) {
      this.tokens.delete(token);
      return null;
    }

    // Find user
    const user = this.users.get(authToken.userId);
    if (!user || !user.active) {
      return null;
    }

    return user;
  }

  changePassword(userId: string, oldPassword: string, newPassword: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    // Verify old password
    const oldPasswordHash = this.hashPassword(oldPassword);
    if (oldPasswordHash !== user.passwordHash) {
      logger.warn(`❌ Password change failed - invalid old password: ${user.username}`);
      return false;
    }

    // Update password
    user.passwordHash = this.hashPassword(newPassword);
    logger.info(`✅ Password changed for: ${user.username}`);
    return true;
  }

  addUser(username: string, email: string, password: string, role: 'admin' | 'operator' = 'operator'): AuthUser | null {
    // Check if username exists
    for (const u of this.users.values()) {
      if (u.username === username) {
        logger.warn(`❌ Username already exists: ${username}`);
        return null;
      }
    }

    const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
    const newUser: AuthUser = {
      id: userId,
      username,
      passwordHash: this.hashPassword(password),
      email,
      role,
      active: true,
      createdAt: Date.now(),
    };

    this.users.set(userId, newUser);
    logger.info(`✅ New user created: ${username} (${role})`);
    return newUser;
  }

  getUser(userId: string): AuthUser | undefined {
    return this.users.get(userId);
  }

  listUsers(): AuthUser[] {
    return Array.from(this.users.values()).map(u => ({
      ...u,
      passwordHash: '[redacted]',
    }));
  }

  deactivateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.active = false;
    logger.info(`✅ User deactivated: ${user.username}`);
    return true;
  }

  activateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.active = true;
    logger.info(`✅ User activated: ${user.username}`);
    return true;
  }
}

export const authService = new AuthService();
