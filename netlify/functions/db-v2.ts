import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

// Use Netlify's Neon database URL
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL not configured. Please enable Neon integration on Netlify.');
}

const sql = neon(DATABASE_URL);

const TTL_DAYS = 3; // Tasks tự động xóa sau 3 ngày

// Initialize database tables
async function initDB() {
  try {
    // Users table - Lưu vĩnh viễn
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

    // Tasks table - Có TTL
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
        created_at BIGINT NOT NULL,
        synced_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      )
    `;

    // Tạo index để tăng tốc cleanup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tasks_synced_at ON tasks(synced_at)
    `;

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Cleanup tasks cũ hơn TTL_DAYS
async function cleanupOldTasks() {
  try {
    const cutoffTime = Date.now() - (TTL_DAYS * 24 * 60 * 60 * 1000);
    
    const result = await sql`
      DELETE FROM tasks 
      WHERE synced_at < ${cutoffTime}
      RETURNING id
    `;

    if (result.length > 0) {
      console.log(`🗑️ Cleaned up ${result.length} tasks older than ${TTL_DAYS} days`);
    }
    
    return result.length;
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return 0;
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

      // Cleanup old tasks (gọi định kỳ hoặc trước mỗi lần sync)
      case 'cleanup':
        const deletedCount = await cleanupOldTasks();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            deletedCount,
            message: `Cleaned up ${deletedCount} tasks` 
          }),
        };

      // ==================== USERS ====================

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

      // ==================== TASKS ====================

      // Get all tasks (chỉ lấy tasks còn trong TTL)
      case 'getTasks':
        // Cleanup trước khi lấy
        await cleanupOldTasks();
        
        const tasks = await sql`
          SELECT * FROM tasks 
          ORDER BY created_at DESC
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(tasks),
        };

      // Save task (insert or update)
      case 'saveTask':
        const currentTime = Date.now();
        const existing = await sql`SELECT id FROM tasks WHERE id = ${data.id}`;
        
        if (existing.length > 0) {
          // Update - cập nhật synced_at để reset TTL
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
                due_date = ${data.dueDate},
                synced_at = ${currentTime}
            WHERE id = ${data.id}
          `;
        } else {
          // Insert
          await sql`
            INSERT INTO tasks (
              id, title, description, dispatch_number, issuing_authority, 
              issue_date, recurring, assignee_id, creator_id, status, 
              priority, due_date, created_at, synced_at
            ) VALUES (
              ${data.id}, ${data.title}, ${data.description}, ${data.dispatchNumber || null},
              ${data.issuingAuthority || null}, ${data.issueDate || null}, ${data.recurring || 'NONE'},
              ${data.assigneeId}, ${data.creatorId}, ${data.status},
              ${data.priority}, ${data.dueDate}, ${data.createdAt}, ${currentTime}
            )
          `;
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, task: data }),
        };

      // Batch save tasks (để sync nhanh hơn)
      case 'batchSaveTasks':
        const currentTimestamp = Date.now();
        const tasksToSave = data.tasks || [];
        
        for (const task of tasksToSave) {
          const existingTask = await sql`SELECT id FROM tasks WHERE id = ${task.id}`;
          
          if (existingTask.length > 0) {
            // Update
            await sql`
              UPDATE tasks 
              SET title = ${task.title},
                  description = ${task.description},
                  dispatch_number = ${task.dispatchNumber || null},
                  issuing_authority = ${task.issuingAuthority || null},
                  issue_date = ${task.issueDate || null},
                  recurring = ${task.recurring || 'NONE'},
                  assignee_id = ${task.assigneeId},
                  status = ${task.status},
                  priority = ${task.priority},
                  due_date = ${task.dueDate},
                  synced_at = ${currentTimestamp}
              WHERE id = ${task.id}
            `;
          } else {
            // Insert
            await sql`
              INSERT INTO tasks (
                id, title, description, dispatch_number, issuing_authority, 
                issue_date, recurring, assignee_id, creator_id, status, 
                priority, due_date, created_at, synced_at
              ) VALUES (
                ${task.id}, ${task.title}, ${task.description}, ${task.dispatchNumber || null},
                ${task.issuingAuthority || null}, ${task.issueDate || null}, ${task.recurring || 'NONE'},
                ${task.assigneeId}, ${task.creatorId}, ${task.status},
                ${task.priority}, ${task.dueDate}, ${task.createdAt}, ${currentTimestamp}
              )
            `;
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            saved: tasksToSave.length 
          }),
        };

      // Delete task
      case 'deleteTask':
        await sql`DELETE FROM tasks WHERE id = ${data.id}`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      // Get sync statistics
      case 'getSyncStats':
        const totalTasks = await sql`SELECT COUNT(*) as count FROM tasks`;
        const oldTasks = await sql`
          SELECT COUNT(*) as count FROM tasks 
          WHERE synced_at < ${Date.now() - (TTL_DAYS * 24 * 60 * 60 * 1000)}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            totalTasks: totalTasks[0].count,
            oldTasks: oldTasks[0].count,
            ttlDays: TTL_DAYS,
            nextCleanup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
