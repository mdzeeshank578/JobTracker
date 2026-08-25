import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let supabase = null;
let pgPool = null;

if (postgresUrl) {
  try {
    const pgModule = await import('pg');
    const Pool = pgModule.default?.Pool || pgModule.Pool;
    if (Pool) {
      pgPool = new Pool({
        connectionString: postgresUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      console.log('🐘 Connected to Native PostgreSQL Database successfully.');
    }
  } catch (err) {
    console.warn('❌ PostgreSQL driver notice:', err.message);
  }
} else if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('🔌 Connected to Supabase PostgreSQL Database successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('⚠️ PostgreSQL/Supabase environment variables not set. Running in local JSON database mode.');
}

// Fallback JSON DB configuration
const FALLBACK_DB_PATH = path.join(__dirname, '..', 'data', 'db_fallback.json');

// Initialize fallback JSON file
function initializeFallbackDb() {
  const dir = path.dirname(FALLBACK_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify({
      applications: [],
      sync_accounts: [],
      sync_logs: []
    }, null, 2), 'utf8');
  }
}

// Read fallback DB with auto-healing for corrupt entries
function readFallbackDb() {
  initializeFallbackDb();
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      applications: Array.isArray(parsed.applications) ? parsed.applications.filter(Boolean) : [],
      sync_accounts: Array.isArray(parsed.sync_accounts) ? parsed.sync_accounts.filter(Boolean) : [],
      sync_logs: Array.isArray(parsed.sync_logs) ? parsed.sync_logs.filter(Boolean) : [],
      users: Array.isArray(parsed.users) ? parsed.users.filter(Boolean) : [],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles.filter(p => p && p.user_id) : []
    };
  } catch (e) {
    console.error('Failed to read fallback database:', e);
    return { applications: [], sync_accounts: [], sync_logs: [], users: [], profiles: [] };
  }
}

function writeFallbackDb(data) {
  initializeFallbackDb();
  try {
    const tempPath = `${FALLBACK_DB_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, FALLBACK_DB_PATH);
  } catch (e) {
    console.error('Failed to write to fallback database:', e);
  }
}

// Helper: Map database row (snake_case) to profile object (camelCase + standard fields)
function mapProfileFromDb(row) {
  if (!row) return null;
  
  const parseJson = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  return {
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    fullName: row.full_name ?? row.fullName ?? '',
    professionalTitle: row.professional_title ?? row.professionalTitle ?? '',
    targetRoleLevel: row.target_role_level ?? row.targetRoleLevel ?? '',
    tagline: row.tagline ?? '',
    bio: row.bio ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    location: row.location ?? '',
    linkedIn: row.linkedin ?? row.linkedIn ?? '',
    github: row.github ?? '',
    portfolio: row.portfolio ?? '',
    twitter: row.twitter ?? '',
    devBlog: row.dev_blog ?? row.devBlog ?? '',
    availability: row.availability ?? '',
    workStatus: row.work_status ?? row.workStatus ?? '',
    careerObjective: row.career_objective ?? row.careerObjective ?? '',
    showObjective: row.show_objective ?? row.showObjective ?? false,
    workExperience: parseJson(row.work_experience ?? row.workExperience) || [],
    projects: parseJson(row.projects) || [],
    educationList: parseJson(row.education_list ?? row.educationList) || [],
    schoolingList: parseJson(row.schooling_list ?? row.schoolingList) || [],
    languagesList: parseJson(row.languages_list ?? row.languagesList) || [],
    achievements: parseJson(row.achievements) || [],
    certifications: parseJson(row.certifications) || [],
    publications: parseJson(row.publications) || [],
    volunteering: parseJson(row.volunteering) || [],
    hackathons: parseJson(row.hackathons) || [],
    technicalSkills: row.technical_skills ?? row.technicalSkills ?? '',
    frameworks: row.frameworks ?? '',
    databases: row.databases ?? '',
    softSkills: row.soft_skills ?? row.softSkills ?? '',
    tools: row.tools ?? '',
    languages: row.languages ?? '',
    interests: row.interests ?? '',
    education: row.education ?? '',
    atsKeywords: row.ats_keywords ?? row.atsKeywords ?? '',
    skills: row.skills ?? '',
    workHistory: row.work_history ?? row.workHistory ?? '',
    cvCustomization: parseJson(row.cv_customization ?? row.cvCustomization) || {
      template: 'jakes',
      colorTheme: 'blue',
      fontStyle: 'Inter',
      showSidebar: true
    },
    updated_at: row.updated_at || new Date().toISOString()
  };
}

// Database methods
export const dbService = {
  // --- USERS & AUTHENTICATION ---
  async getUserByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return null;
    let foundUser = null;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
        if (!error && data) foundUser = data;
      } catch (e) {}
    }
    if (!foundUser) {
      const db = readFallbackDb();
      if (!db.users) db.users = [];
      foundUser = db.users.find(u => u && u.email && u.email.toLowerCase().trim() === cleanEmail) || null;
    }
    if (!foundUser) return null;
    const userId = foundUser.id || foundUser.uid || foundUser.userId;
    return {
      ...foundUser,
      id: userId,
      uid: userId,
      userId: userId
    };
  },

  async createUser(email, rawPassword, displayName) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account already exists with this email address.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    
    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(rawPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    const user = {
      id: userId,
      uid: userId,
      userId: userId,
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      salt,
      hash,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('users').insert([user]);
      } catch (err) {
        console.warn('Supabase user insert skipped, writing to fallback db:', err.message);
      }
    }

    const db = readFallbackDb();
    if (!db.users) db.users = [];
    db.users.push(user);
    writeFallbackDb(db);
    return {
      id: user.id,
      uid: user.id,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      created_at: user.created_at
    };
  },

  async validateUserPassword(email, rawPassword) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await this.getUserByEmail(cleanEmail);
    if (!user) return null;
    
    let isValid = false;
    if (user.hash && user.salt) {
      const checkHash = crypto.pbkdf2Sync(rawPassword, user.salt, 1000, 64, 'sha512').toString('hex');
      isValid = (checkHash === user.hash);
    } else if (user.password) {
      isValid = (user.password === rawPassword);
    }

    if (!isValid) return null;

    const userId = user.id || user.uid || user.userId;
    return {
      id: userId,
      uid: userId,
      userId: userId,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0]
    };
  },

  // --- APPLICATIONS ---
  async getApplications(userId) {
    if (!userId) return [];
    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM job_applications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows;
      } catch (err) {
        try {
          const res = await pgPool.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
          return res.rows;
        } catch (e) {}
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return (db.applications || []).filter(app => app.user_id === userId || app.userId === userId);
    }
  },

  async addApplication(userId, appData) {
    if (!userId) throw new Error('userId is required to add application');
    const record = {
      id: appData.id || appData._id || crypto.randomUUID(),
      user_id: userId,
      company: appData.company || appData.companyName,
      role: appData.role || appData.jobTitle,
      status: appData.status || 'Applied',
      date_applied: appData.dateApplied || appData.appliedDate || new Date().toISOString().split('T')[0],
      deadline: appData.deadline || null,
      notes: appData.notes || '',
      job_url: appData.jobUrl || appData.job_url || '',
      location: appData.location || '',
      source: appData.source || 'Manual',
      snippet: appData.snippet || ''
    };

    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO job_applications (id, user_id, company, role, status, date_applied, deadline, notes, job_url, location, source, snippet)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [record.id, record.user_id, record.company, record.role, record.status, record.date_applied, record.deadline, record.notes, record.job_url, record.location, record.source, record.snippet]
        );
        return record;
      } catch (err) {
        try {
          await pgPool.query(
            `INSERT INTO applications (id, user_id, company, role, status, date_applied, deadline, notes, job_url, location, source, snippet)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [record.id, record.user_id, record.company, record.role, record.status, record.date_applied, record.deadline, record.notes, record.job_url, record.location, record.source, record.snippet]
          );
          return record;
        } catch (e) {}
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .insert([record])
          .select();
        if (!error && data) return data[0];
      } catch (e) {}

      const { data, error } = await supabase
        .from('applications')
        .insert([record])
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      if (!db.applications) db.applications = [];
      const newRecord = {
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.applications.unshift(newRecord);
      writeFallbackDb(db);
      return newRecord;
    }
  },

  async updateApplication(userId, companyName, roleName, status, updates = {}) {
    if (!userId) throw new Error('userId is required to update application');
    
    if (pgPool) {
      try {
        const res = await pgPool.query(
          `UPDATE job_applications
           SET status = COALESCE($1, status),
               notes = COALESCE($2, notes),
               job_url = COALESCE($3, job_url),
               updated_at = NOW()
           WHERE user_id = $4 AND LOWER(company) = LOWER($5) AND LOWER(role) = LOWER($6)
           RETURNING *`,
          [status || null, updates.notes || null, updates.jobUrl || updates.job_url || null, userId, companyName, roleName]
        );
        if (res.rows.length > 0) return res.rows;
      } catch (err) {}
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .update({ status, ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .ilike('company', companyName)
          .ilike('role', roleName)
          .select();
        if (!error && data) return data;
      } catch (e) {}

      const { data, error } = await supabase
        .from('applications')
        .update({ status, ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .ilike('company', companyName)
        .ilike('role', roleName)
        .select();
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      const cleanCompany = (companyName || '').toLowerCase().trim();
      const cleanRole = (roleName || '').toLowerCase().trim();
      let updated = [];

      db.applications = (db.applications || []).map(app => {
        if ((app.user_id === userId || app.userId === userId) &&
            (app.company || '').toLowerCase().trim() === cleanCompany &&
            (app.role || '').toLowerCase().trim() === cleanRole) {
          const updatedApp = {
            ...app,
            ...(status ? { status } : {}),
            ...updates,
            updated_at: new Date().toISOString()
          };
          updated.push(updatedApp);
          return updatedApp;
        }
        return app;
      });

      writeFallbackDb(db);
      return updated;
    }
  },

  async deleteApplication(userId, jobId) {
    if (!userId || !jobId) return false;

    if (pgPool) {
      try {
        const res = await pgPool.query(
          'DELETE FROM job_applications WHERE (id = $1 OR id = $2) AND user_id = $3',
          [jobId, jobId, userId]
        );
        if (res.rowCount > 0) return true;
      } catch (err) {
        try {
          const res = await pgPool.query(
            'DELETE FROM applications WHERE (id = $1 OR id = $2) AND user_id = $3',
            [jobId, jobId, userId]
          );
          if (res.rowCount > 0) return true;
        } catch (e) {}
      }
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('job_applications')
          .delete()
          .eq('id', jobId)
          .eq('user_id', userId);
        if (!error) return true;
      } catch (e) {}

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', jobId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    } else {
      const db = readFallbackDb();
      const initialLength = (db.applications || []).length;
      db.applications = (db.applications || []).filter(
        app => !((app.id === jobId || app._id === jobId) && (app.user_id === userId || app.userId === userId))
      );
      writeFallbackDb(db);
      return db.applications.length < initialLength;
    }
  },

  async getProfile(userId) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return null;
    }
    const cleanUserId = userId.trim();

    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [cleanUserId]);
        if (res.rows.length > 0) {
          return mapProfileFromDb(res.rows[0]);
        }
      } catch (err) {
        console.warn('PostgreSQL getProfile notice:', err.message);
      }
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', cleanUserId)
        .maybeSingle();
      if (error) throw error;
      return mapProfileFromDb(data);
    } else {
      const db = readFallbackDb();
      if (!db.profiles) db.profiles = [];
      const found = db.profiles.find(p => p && p.user_id && p.user_id === cleanUserId) || null;
      return mapProfileFromDb(found);
    }
  },

  async saveProfile(userId, profileData) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('userId is required and must be a valid non-empty string.');
    }
    const cleanUserId = userId.trim();
    const safeData = profileData && typeof profileData === 'object' ? profileData : {};

    const stringifyJson = (val) => (val !== undefined && val !== null ? (typeof val === 'string' ? val : JSON.stringify(val)) : JSON.stringify([]));

    if (pgPool) {
      try {
        const query = `
          INSERT INTO profiles (
            user_id, full_name, professional_title, target_role_level, tagline, bio,
            email, phone, location, linkedin, github, portfolio, twitter, dev_blog,
            availability, work_status, career_objective, work_experience, projects,
            education_list, schooling_list, languages_list, achievements, certifications,
            publications, volunteering, hackathons, technical_skills, frameworks,
            databases, soft_skills, tools, languages, interests, ats_keywords,
            cv_customization, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
            $33, $34, $35, $36, NOW()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            professional_title = EXCLUDED.professional_title,
            target_role_level = EXCLUDED.target_role_level,
            tagline = EXCLUDED.tagline,
            bio = EXCLUDED.bio,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            location = EXCLUDED.location,
            linkedin = EXCLUDED.linkedin,
            github = EXCLUDED.github,
            portfolio = EXCLUDED.portfolio,
            twitter = EXCLUDED.twitter,
            dev_blog = EXCLUDED.dev_blog,
            availability = EXCLUDED.availability,
            work_status = EXCLUDED.work_status,
            career_objective = EXCLUDED.career_objective,
            work_experience = EXCLUDED.work_experience,
            projects = EXCLUDED.projects,
            education_list = EXCLUDED.education_list,
            schooling_list = EXCLUDED.schooling_list,
            languages_list = EXCLUDED.languages_list,
            achievements = EXCLUDED.achievements,
            certifications = EXCLUDED.certifications,
            publications = EXCLUDED.publications,
            volunteering = EXCLUDED.volunteering,
            hackathons = EXCLUDED.hackathons,
            technical_skills = EXCLUDED.technical_skills,
            frameworks = EXCLUDED.frameworks,
            databases = EXCLUDED.databases,
            soft_skills = EXCLUDED.soft_skills,
            tools = EXCLUDED.tools,
            languages = EXCLUDED.languages,
            interests = EXCLUDED.interests,
            ats_keywords = EXCLUDED.ats_keywords,
            cv_customization = EXCLUDED.cv_customization,
            updated_at = NOW()
          RETURNING *;
        `;
        const values = [
          cleanUserId,
          safeData.fullName || '',
          safeData.professionalTitle || '',
          safeData.targetRoleLevel || '',
          safeData.tagline || '',
          safeData.bio || '',
          safeData.email || '',
          safeData.phone || '',
          safeData.location || '',
          safeData.linkedIn || safeData.linkedin || '',
          safeData.github || '',
          safeData.portfolio || '',
          safeData.twitter || '',
          safeData.devBlog || safeData.dev_blog || '',
          safeData.availability || '',
          safeData.workStatus || safeData.work_status || '',
          safeData.careerObjective || safeData.career_objective || '',
          stringifyJson(safeData.workExperience || safeData.work_experience),
          stringifyJson(safeData.projects),
          stringifyJson(safeData.educationList || safeData.education_list),
          stringifyJson(safeData.schoolingList || safeData.schooling_list),
          stringifyJson(safeData.languagesList || safeData.languages_list),
          stringifyJson(safeData.achievements),
          stringifyJson(safeData.certifications),
          stringifyJson(safeData.publications),
          stringifyJson(safeData.volunteering),
          stringifyJson(safeData.hackathons),
          safeData.technicalSkills || safeData.technical_skills || '',
          safeData.frameworks || '',
          safeData.databases || '',
          safeData.softSkills || safeData.soft_skills || '',
          safeData.tools || '',
          safeData.languages || '',
          safeData.interests || '',
          safeData.atsKeywords || safeData.ats_keywords || '',
          stringifyJson(safeData.cvCustomization || safeData.cv_customization || { template: 'jakes', colorTheme: 'blue', fontStyle: 'Inter', showSidebar: true })
        ];

        const res = await pgPool.query(query, values);
        if (res.rows.length > 0) {
          return mapProfileFromDb(res.rows[0]);
        }
      } catch (err) {
        console.warn('PostgreSQL saveProfile notice:', err.message);
      }
    }

    const record = {
      user_id: cleanUserId,
      ...safeData,
      updated_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([record], { onConflict: 'user_id' })
        .select();
      if (error) throw error;
      return mapProfileFromDb(data[0]);
    } else {
      const db = readFallbackDb();
      if (!db.profiles) db.profiles = [];
      const idx = db.profiles.findIndex(p => p && p.user_id && p.user_id === cleanUserId);
      if (idx >= 0) {
        db.profiles[idx] = { ...db.profiles[idx], ...record };
      } else {
        db.profiles.push(record);
      }
      writeFallbackDb(db);
      return mapProfileFromDb(record);
    }
  },

  // --- SYNC ACCOUNTS ---
  async getSyncAccount(userId, provider, email) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_accounts.find(
        acc => acc.user_id === userId && acc.provider === provider && acc.email === email
      ) || null;
    }
  },

  async getSyncAccounts(userId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_accounts.filter(acc => acc.user_id === userId);
    }
  },

  async saveSyncAccount(userId, provider, email, tokenData) {
    const record = {
      user_id: userId,
      provider,
      email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expiry_date: tokenData.expiry_date || null
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .upsert([record], { onConflict: 'user_id,provider,email' })
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      const existingIdx = db.sync_accounts.findIndex(
        acc => acc.user_id === userId && acc.provider === provider && acc.email === email
      );

      const recordWithTimestamps = {
        id: existingIdx >= 0 ? db.sync_accounts[existingIdx].id : crypto.randomUUID(),
        ...record,
        created_at: existingIdx >= 0 ? db.sync_accounts[existingIdx].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        db.sync_accounts[existingIdx] = recordWithTimestamps;
      } else {
        db.sync_accounts.push(recordWithTimestamps);
      }

      writeFallbackDb(db);
      return recordWithTimestamps;
    }
  },

  async deleteSyncAccount(userId, provider, email) {
    if (supabase) {
      const { error } = await supabase
        .from('sync_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('email', email);
      if (error) throw error;
      return true;
    } else {
      const db = readFallbackDb();
      db.sync_accounts = db.sync_accounts.filter(
        acc => !(acc.user_id === userId && acc.provider === provider && acc.email === email)
      );
      writeFallbackDb(db);
      return true;
    }
  },

  // --- SYNC LOGS ---
  async getSyncLogs(userId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_logs
        .filter(log => log.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    }
  },

  async addSyncLog(userId, eventType, status, message, details = {}) {
    const record = {
      user_id: userId,
      event_type: eventType,
      status,
      message,
      details
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('sync_logs')
        .insert([record])
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      const newLog = {
        id: crypto.randomUUID(),
        ...record,
        created_at: new Date().toISOString()
      };
      db.sync_logs.push(newLog);
      writeFallbackDb(db);
      return newLog;
    }
  }
};
