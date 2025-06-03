// Usage reference on @/utils/validator.ts
const email = { name: 'email', type: 'string', isEmail: true };
const password = { name: 'password', type: 'string', min: 6 };
const retypePassword = { name: 'retype_password', type: 'string', min: 6 };

module.exports = {
  register: [
    { name: 'username', type: 'string' },
    { ...email },
    { ...password },
    { ...retypePassword },
  ],

  login: [{ ...email }, { ...password }],

  forgotPassword: [{ ...email }],

  sendPasswordResetVerification: [{ ...email }],

  resetPassword: [{ name: 'token', type: 'text' }, { ...password }, { ...retypePassword }],

  resendVerification: [{ ...email }],
};
