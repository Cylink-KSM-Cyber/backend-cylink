const pool = require('@/config/database');

exports.getUserByEmail = async (email: string) => {
  return await pool.query(
    'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email],
  ).rows;
};

exports.createUser = async (user: any) => {
  return await pool.query(
    'INSERT INTO users VALUES ',
    [],
  );
};
