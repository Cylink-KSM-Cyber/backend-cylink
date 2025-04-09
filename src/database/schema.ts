/**
 * Abstraction layer for defining SQL tables.
 * 
 * Usage: {
 *   table_name: {
 *     column_name: 'raw schema definition',
 *   }
 * }
 */
module.exports = {
  users: {
    id: 'SERIAL PRIMARY KEY',
    email: 'VARCHAR(255) NOT NULL',
    password: 'VARCHAR(255) NOT NULL',
    username: 'VARCHAR(255)',
    role: `ENUM('user', 'admin')`,
    verification_token: 'VARCHAR(255)',
    email_verified_at: 'TIMESTAMP',
    last_email_verify_requested_at: 'TIMESTAMP',
    timestamps: true,
  },
};
