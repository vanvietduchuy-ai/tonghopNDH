import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL not configured');
}

const sql = neon(DATABASE_URL);

// TTL: 3 days
const TTL_MS = 3 * 24 * 60 * 60 * 1000;

async function initDB() {
  try {
    // Sync data table with TTL
    await sql`
      CREATE TABLE IF NOT EXISTS sync_data (
        device_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `;

    // Index for faster cleanup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON sync_data(expires_at)
    `;

    console.log('✅ TTL Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, data } = JSON.parse(event.body || '{}');

    switch (action) {
      // Initialize database
      case 'init':
        await initDB();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      // Upload data with TTL
      case 'uploadWithTTL':
        const { deviceId, users, tasks } = data;
        const now = Date.now();
        const expiresAt = now + TTL_MS;

        await sql`
          INSERT INTO sync_data (device_id, data, created_at, expires_at)
          VALUES (
            ${deviceId},
            ${JSON.stringify({ users, tasks })},
            ${now},
            ${expiresAt}
          )
          ON CONFLICT (device_id) 
          DO UPDATE SET 
            data = ${JSON.stringify({ users, tasks })},
            created_at = ${now},
            expires_at = ${expiresAt}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            expiresAt: new Date(expiresAt).toISOString() 
          }),
        };

      // Download data (if not expired)
      case 'downloadWithTTL':
        const now2 = Date.now();
        const [syncData] = await sql`
          SELECT data, created_at, expires_at 
          FROM sync_data 
          WHERE device_id = ${data.deviceId}
            AND expires_at > ${now2}
        `;

        if (!syncData) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ data: null, message: 'No data or expired' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            data: syncData.data,
            createdAt: syncData.created_at,
            expiresAt: syncData.expires_at
          }),
        };

      // Cleanup expired data
      case 'cleanupExpired':
        const now3 = Date.now();
        const result = await sql`
          DELETE FROM sync_data 
          WHERE expires_at < ${now3}
        `;

        console.log(`🧹 Cleaned up expired records`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Cleanup completed'
          }),
        };

      // Get all devices (for debugging)
      case 'listDevices':
        const devices = await sql`
          SELECT device_id, created_at, expires_at
          FROM sync_data
          ORDER BY created_at DESC
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ devices }),
        };

      // Legacy methods for backward compatibility
      case 'getUsers':
      case 'getTasks':
      case 'addUser':
      case 'updateUser':
      case 'deleteUser':
      case 'saveTask':
      case 'deleteTask':
      case 'login':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            error: 'Legacy method - use TTL sync instead',
            message: 'Data is now stored locally with cloud TTL sync'
          }),
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unknown action' }),
        };
    }
  } catch (error) {
    console.error('❌ Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database error',
        message: error instanceof Error ? error.message : String(error)
      }),
    };
  }
};
