// Usage reference on @/utils/validator.ts
const email = { name: 'email', type: 'string' };
const password = { name: 'password', type: 'string' };

module.exports = {
  register: [
    { name: 'username', type: 'string' },
    { ...email  },
    { ...password },
    { name: 'retype_password', type: 'string' },
  ],
  
  login: [
    { ...email },
    { ...password },
  ],

  resetPassword: [
    { ...email },
  ],
};
