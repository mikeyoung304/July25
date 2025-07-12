import { Pool } from 'pg';
import { getConfig } from './environment';
import { logger } from '../utils/logger';

const config = getConfig();

// Create a new PostgreSQL connection pool using the DATABASE_URL
const pool = new Pool({
  connectionString: config.database.url,
});

// Test database connection
export async function initializeDatabase(): Promise<void> {
  let client;
  try {
    // Get a client from the pool and run a simple query
    client = await pool.connect();
    await client.query('SELECT NOW()'); // A simple query to check the connection
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  } finally {
    // Make sure to release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

// Export the pool for use in other parts of the application
export const dbPool = pool;