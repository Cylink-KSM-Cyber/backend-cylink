const pool = require('../config/database');

(async () => {
  await pool.query(`
    -- Check if email verification has expired
    CREATE OR REPLACE FUNCTION check_email_expiry()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.email_verified_at IS NULL AND NEW.created_at < NOW() - INTERVAL '1 hour' THEN
        DELETE FROM users WHERE email = NEW.email;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER email_expiry_trigger
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION check_email_expiry();  
  `);
});
