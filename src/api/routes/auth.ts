import { Router, Request, Response } from 'express';
import { authService } from '../../services/auth';
import { logger } from '../../utils/logger';
import { verifyAuth, requireAdmin, rateLimitLogin } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', rateLimitLogin, (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password required',
      });
      return;
    }

    const result = authService.login(username, password);

    if (!result) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password',
      });
      return;
    }

    // Check if TOTP is required
    if (result.type === 'totp_required') {
      res.json({
        success: false,
        requiresTotp: true,
        challengeToken: result.challengeToken,
        message: 'TOTP verification required',
      });
      return;
    }

    // Password-only login (no 2FA)
    const token = result.token;
    res.setHeader(
      'Set-Cookie',
      `authToken=${token.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`,
    );

    res.json({
      success: true,
      token: token.token,
      expiresIn: token.expiresAt - token.createdAt,
      message: 'Login successful',
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', verifyAuth, (req: Request, res: Response) => {
  try {
    if (req.token && authService.logout(req.token)) {
      // Clear cookie
      res.setHeader('Set-Cookie', 'authToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Logout failed',
      });
    }
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for current user
 */
router.post('/change-password', verifyAuth, (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'All password fields required',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Passwords do not match',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
      });
      return;
    }

    const success = authService.changePassword(req.user!.id, oldPassword, newPassword);

    if (success) {
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid current password',
      });
    }
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password change failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', verifyAuth, (req: Request, res: Response) => {
  try {
    const user = authService.getUser(req.user!.id);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info',
    });
  }
});

/**
 * POST /api/auth/users (admin only)
 * Create a new user
 */
router.post('/users', verifyAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Username, email, and password required',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
      });
      return;
    }

    const newUser = authService.addUser(username, email, password, role || 'operator');

    if (newUser) {
      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Failed to create user',
      });
    }
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user',
    });
  }
});

/**
 * GET /api/auth/users (admin only)
 * List all users
 */
router.get('/users', verifyAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const users = authService.listUsers();

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list users',
    });
  }
});

/**
 * POST /api/auth/users/:userId/deactivate (admin only)
 * Deactivate a user
 */
router.post('/users/:userId/deactivate', verifyAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot deactivate yourself',
      });
      return;
    }

    const success = authService.deactivateUser(userId);

    if (success) {
      res.json({
        success: true,
        message: 'User deactivated',
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }
  } catch (error) {
    logger.error('Deactivate user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to deactivate user',
    });
  }
});

/**
 * POST /api/auth/totp/verify
 * Verify TOTP code and complete login
 */
router.post('/totp/verify', rateLimitLogin, (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = req.body;

    if (!challengeToken || !code) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Challenge token and TOTP code required',
      });
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'TOTP code must be 6 digits',
      });
      return;
    }

    const token = authService.verifyTotp(challengeToken, code);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired TOTP code',
      });
      return;
    }

    // Set secure cookie
    res.setHeader(
      'Set-Cookie',
      `authToken=${token.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`,
    );

    res.json({
      success: true,
      token: token.token,
      expiresIn: token.expiresAt - token.createdAt,
      message: 'TOTP verification successful',
    });
  } catch (error) {
    logger.error('TOTP verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'TOTP verification failed',
    });
  }
});

/**
 * POST /api/auth/totp/setup
 * Initiate TOTP setup - returns secret and QR code
 */
router.post('/totp/setup', verifyAuth, async (req: Request, res: Response) => {
  try {
    const result = await authService.setupTotp(req.user!.id);

    if (!result) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to setup TOTP',
      });
      return;
    }

    res.json({
      success: true,
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      qrCodeDataUrl: result.qrCodeDataUrl,
      message: 'TOTP setup initiated',
    });
  } catch (error) {
    logger.error('TOTP setup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'TOTP setup failed',
    });
  }
});

/**
 * POST /api/auth/totp/enable
 * Verify TOTP code and enable 2FA
 */
router.post('/totp/enable', verifyAuth, (req: Request, res: Response) => {
  try {
    const { secret, code } = req.body;

    if (!secret || !code) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Secret and TOTP code required',
      });
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'TOTP code must be 6 digits',
      });
      return;
    }

    const success = authService.verifyAndEnableTotp(req.user!.id, secret, code);

    if (success) {
      res.json({
        success: true,
        message: '2FA enabled successfully',
      });
    } else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid TOTP code',
      });
    }
  } catch (error) {
    logger.error('TOTP enable error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enable TOTP',
    });
  }
});

/**
 * POST /api/auth/totp/disable
 * Disable 2FA (admin only)
 */
router.post('/totp/disable', verifyAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'User ID required',
      });
      return;
    }

    const success = authService.disableTotp(userId);

    if (success) {
      res.json({
        success: true,
        message: '2FA disabled',
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }
  } catch (error) {
    logger.error('TOTP disable error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disable TOTP',
    });
  }
});

export default router;
