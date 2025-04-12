const pool = require('@/config/database');

exports.getUserByEmail = async (email: string) => {
  const res = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [
    email,
  ]);

  return res.rows[0];
};

exports.createUser = async (_user: any) => {
  return pool.query('INSERT INTO users VALUES ', [])[0];
};
