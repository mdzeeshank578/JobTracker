import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FALLBACK_DB_PATH = path.join(__dirname, '..', 'data', 'db_fallback.json');
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function runDataCleanup() {
  console.log('🧹 Starting Data Cleanup Script...');

  // 1. Live PostgreSQL Database Cleanup (if connected)
  if (postgresUrl) {
    try {
      const pgModule = await import('pg');
      const Pool = pgModule.default?.Pool || pgModule.Pool;
      if (Pool) {
        const pool = new Pool({
          connectionString: postgresUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        console.log('🐘 Connected to PostgreSQL for data cleanup...');

        // Remove dummy / test entries from PostgreSQL
        const deleteQueries = [
          `DELETE FROM public.sync_logs WHERE user_id LIKE 'test%' OR user_id LIKE 'dummy%' OR user_id LIKE 'user_test%'`,
          `DELETE FROM public.sync_accounts WHERE user_id LIKE 'test%' OR user_id LIKE 'dummy%' OR user_id LIKE 'user_test%'`,
          `DELETE FROM public.applications WHERE user_id LIKE 'test%' OR user_id LIKE 'dummy%' OR user_id LIKE 'user_test%' OR company ILIKE '%test%'`,
          `DELETE FROM public.profiles WHERE user_id LIKE 'test%' OR user_id LIKE 'dummy%' OR user_id LIKE 'user_test%' OR email ILIKE '%test%'`,
          `DELETE FROM public.users WHERE id LIKE 'test%' OR id LIKE 'dummy%' OR email ILIKE '%test%'`
        ];

        for (const q of deleteQueries) {
          const res = await pool.query(q);
          console.log(`Executed: ${q} => Affected rows: ${res.rowCount}`);
        }

        await pool.end();
        console.log('✅ PostgreSQL live database cleanup complete.');
      }
    } catch (err) {
      console.warn('⚠️ PostgreSQL cleanup notice:', err.message);
    }
  }

  // 2. Local Fallback JSON Database Cleanup
  if (fs.existsSync(FALLBACK_DB_PATH)) {
    try {
      const raw = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
      const data = JSON.parse(raw);

      const isTestUser = (id) => !id || id.startsWith('test') || id.startsWith('dummy') || id.includes('user_999');

      const cleanedData = {
        users: (data.users || []).filter(u => u && u.email && !u.email.includes('test@') && !isTestUser(u.id)),
        profiles: (data.profiles || []).filter(p => p && p.user_id && !isTestUser(p.user_id) && !p.email?.includes('test@')),
        applications: (data.applications || []).filter(a => a && a.user_id && !isTestUser(a.user_id) && !a.company?.toLowerCase().includes('test')),
        sync_accounts: (data.sync_accounts || []).filter(sa => sa && sa.user_id && !isTestUser(sa.user_id)),
        sync_logs: (data.sync_logs || []).filter(sl => sl && sl.user_id && !isTestUser(sl.user_id))
      };

      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(cleanedData, null, 2), 'utf8');
      console.log('✅ Local fallback JSON database (db_fallback.json) cleaned successfully.');
    } catch (e) {
      console.error('❌ Failed to clean fallback JSON database:', e.message);
    }
  }

  console.log('🎉 Data cleanup finished.');
}

runDataCleanup();
