import { schedule } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const TTL_DAYS = 3;

// Function chạy hàng ngày để cleanup tasks cũ
const handler = schedule('0 2 * * *', async () => {
  // Chạy lúc 2h sáng mỗi ngày
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    return {
      statusCode: 500,
    };
  }

  try {
    const sql = neon(DATABASE_URL);
    const cutoffTime = Date.now() - (TTL_DAYS * 24 * 60 * 60 * 1000);
    
    console.log(`🗑️ Running scheduled cleanup for tasks older than ${TTL_DAYS} days...`);
    
    const result = await sql`
      DELETE FROM tasks 
      WHERE synced_at < ${cutoffTime}
      RETURNING id, title, synced_at
    `;

    console.log(`✅ Cleanup completed: ${result.length} tasks deleted`);
    
    if (result.length > 0) {
      console.log('Deleted tasks:', result.map(t => ({
        id: t.id,
        title: t.title,
        age: Math.floor((Date.now() - t.synced_at) / (24 * 60 * 60 * 1000)) + ' days'
      })));
    }

    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error('❌ Scheduled cleanup error:', error);
    return {
      statusCode: 500,
    };
  }
});

export { handler };
