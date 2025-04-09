const router = require('express').Router();
const {
  accessToken,
  refreshToken,
  verificationToken,
} = require('@/middlewares/authMiddleware');
const validate = require('@/utils/validator');
const fields = require('@/validators/authValidator');

const authController = require('@/controllers/authController');

/**
 * User registration via email.
 */
router.post(
  '/register',
  validate({ fields: fields.register }),
  authController.register,
);
router.post(
  '/register/verify',
  verificationToken,
  authController.verifyRegister,
);

/**
 * User password reset via OTP.
 */
router.post(
  '/reset-password/send',
  validate({ fields: fields.sendPasswordResetVerification }),
  authController.sendPasswordResetVerification,
);
router.post(
  '/reset-password',
  verificationToken,
  validate({ fields: fields.resetPassword }),
  authController.resetPassword,
);

/**
 * Resend verification.
 */
router.post(
  '/resend',
  validate({ fields: fields.resendVerification }),
  authController.resendVerification,
);

/**
 * User authentication.
 */
router.post(
  '/login',
  validate({ fields: fields.login }),
  authController.login,
);

/**
 * Refresh access token.
 */
router.post(
  '/refresh',
  accessToken,
  refreshToken,
  authController.refresh,
);

module.exports = router;
