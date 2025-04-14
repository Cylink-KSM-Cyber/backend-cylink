/**
 * Admin User Seeder
 *
 * Creates an admin user with predefined credentials
 * @module database/seeders/adminSeeder
 */

import { User } from '@/collections/userCollection';
import pool from '@/config/database';

const { hash } = require('@/utils/crypto');

/**
 * AdminSeeder class - Responsible for creating admin user
 */
export class AdminSeeder {
  private email: string = 'admin@cylink.id';
  private password: string = 'Admin@Cylink123';
  private username: string = 'Admin';
  private role: string = 'admin';

  /**
   * Seeds the admin user to the database
   * @returns {Promise<User>} The created admin user
   * @throws {Error} If there is an error creating the admin user
   */
  public async seed(): Promise<User> {
    try {
      // Check if admin user already exists
      const existingUser = await this.checkUserExists();
      if (existingUser) {
        console.log(`Admin user ${this.email} already exists.`);
        return existingUser;
      }

      // Hash password before storing
      const hashedPassword = await hash(this.password);

      // Create admin user
      const query = `
        INSERT INTO users (email, password, username, role, email_verified_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        this.email,
        hashedPassword,
        this.username,
        this.role,
      ]);

      const adminUser = result.rows[0];
      console.log(`Admin user ${this.email} created successfully.`);

      return adminUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating admin user: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Checks if the admin user already exists in the database
   * @returns {Promise<User|null>} The existing user or null if not found
   */
  private async checkUserExists(): Promise<User | null> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [this.email]);
      return result.rows[0] || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking if user exists: ${errorMessage}`);
      throw error;
    }
  }
}

// Allow direct execution of this seeder
if (require.main === module) {
  (async () => {
    try {
      const adminSeeder = new AdminSeeder();
      await adminSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed admin user:', error);
      process.exit(1);
    }
  })();
}
