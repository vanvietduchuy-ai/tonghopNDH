import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

// Use Netlify's Neon database URL
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL not configured. Please enable Neon integration on Netlify.');
}

const sql = neon(DATABASE_URL);

// Initialize database tables
async function initDB() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_first_login BOOLEAN DEFAULT true,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar_url TEXT
      )
    `;

    // Tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        dispatch_number TEXT,
        issuing_authority TEXT,
        issue_date TEXT,
        recurring TEXT DEFAULT 'NONE',
        assignee_id TEXT NOT NULL,
        creator_id TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_date TIMESTAMP NOT NULL,
        created_at BIGINT NOT NULL
      )
    `;

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request for CORS
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
          body: JSON.stringify({ success: true, message: 'Database initialized' }),
        };

      // Get all users
      case 'getUsers':
        const users = await sql`SELECT * FROM users`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(users),
        };

      // Add user
      case 'addUser':
        await sql`
          INSERT INTO users (id, username, password, is_first_login, full_name, role, avatar_url)
          VALUES (${data.id}, ${data.username}, ${data.password}, ${data.isFirstLogin}, ${data.fullName}, ${data.role}, ${data.avatarUrl})
          ON CONFLICT (id) DO NOTHING
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      // Update user
      case 'updateUser':
        await sql`
          UPDATE users 
          SET password = ${data.password}, 
              is_first_login = ${data.isFirstLogin},
              full_name = ${data.fullName},
              role = ${data.role},
              avatar_url = ${data.avatarUrl}
          WHERE id = ${data.id}
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      // Delete user
      case 'deleteUser':
        await sql`DELETE FROM tasks WHERE assignee_id = ${data.id} OR creator_id = ${data.id}`;
        await sql`DELETE FROM users WHERE id = ${data.id}`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      // Login
      case 'login':
        const [user] = await sql`
          SELECT * FROM users 
          WHERE username = ${data.username} AND password = ${data.password}
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(user || null),
        };

      // Get all tasks
      case 'getTasks':
        const tasks = await sql`SELECT * FROM tasks ORDER BY created_at DESC`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(tasks),
        };

      // Save task (insert or update)
      case 'saveTask':
        const existing = await sql`SELECT id FROM tasks WHERE id = ${data.id}`;
        
        if (existing.length > 0) {
          // Update
          await sql`
            UPDATE tasks 
            SET title = ${data.title},
                description = ${data.description},
                dispatch_number = ${data.dispatchNumber || null},
                issuing_authority = ${data.issuingAuthority || null},
                issue_date = ${data.issueDate || null},
                recurring = ${data.recurring || 'NONE'},
                assignee_id = ${data.assigneeId},
                status = ${data.status},
                priority = ${data.priority},
                due_date = ${data.dueDate}
            WHERE id = ${data.id}
          `;
        } else {
          // Insert
          await sql`
            INSERT INTO tasks (
              id, title, description, dispatch_number, issuing_authority, 
              issue_date, recurring, assignee_id, creator_id, status, 
              priority, due_date, created_at
            ) VALUES (
              ${data.id}, ${data.title}, ${data.description}, ${data.dispatchNumber || null},
              ${data.issuingAuthority || null}, ${data.issueDate || null}, ${data.recurring || 'NONE'},
              ${data.assigneeId}, ${data.creatorId}, ${data.status},
              ${data.priority}, ${data.dueDate}, ${data.createdAt}
            )
          `;
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, task: data }),
        };

      // Delete task
      case 'deleteTask':
        await sql`DELETE FROM tasks WHERE id = ${data.id}`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
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
