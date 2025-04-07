/**
 * Abstraction layer for defining SQL tables.
 * 
 * Usage: {
 *   table_name: {
 *     column_name: 'raw schema definition',
 *   }
 * }
 */
export default {
  users: {
    id: 'SERIAL PRIMARY KEY',
    email: 'VARCHAR(255) NOT NULL',
    password: 'VARCHAR(255) NOT NULL',
    username: 'VARCHAR(255)',
    role: `ENUM('user', 'admin')`,
    remember_token: 'VARCHAR(255)',
    email_verified_at: 'TIMESTAMP',
    timestamps: true,
  },
};
