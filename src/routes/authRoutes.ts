const router = require('express').Router();
const { authentication } = require('@/middlewares/authMiddleware');
const validate = require('@/utils/validator');
const fields = require('@/validators/authValidator');

const authController = require('@/controllers/authController');

/**
 * User registration via OTP.
 */
router.post(
  '/register',
  validate({ fields: fields.register }),
  authController.register,
);
router.get(
  '/register/verify',
  authentication,
  authController.verifyRegister,
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
  authController.refresh,
);

/**
 * User password reset via OTP.
 */
router.get(
  '/reset-password/verify',
  authController.resetPassword,
);
router.post(
  '/reset-password',
  authentication,
  validate({ fields: fields.resetPassword }),
  authController.verifyResetPassword,
);

module.exports = router;
