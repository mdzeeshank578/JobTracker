import { pgPool, readFallbackDb, writeFallbackDb } from '../config/db.js';
import { createUserEntity } from '../models/User.js';
import { dbService } from '../../services/db.js';

export const userRepository = {
  async findByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {}
    }
    const db = readFallbackDb();
    return (db.users || []).find(u => (u.email || '').toLowerCase().trim() === cleanEmail) || null;
  },

  async findById(id) {
    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {}
    }
    const db = readFallbackDb();
    return (db.users || []).find(u => u.id === id) || null;
  },

  async create(userData) {
    const user = createUserEntity(userData);
    if (pgPool) {
      try {
        await pgPool.query(
          'INSERT INTO users (id, email, display_name, password_hash, salt, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [user.id, user.email, user.displayName, user.hash, user.salt, user.created_at, user.updated_at]
        );
        return user;
      } catch (err) {}
    }
    const db = readFallbackDb();
    if (!db.users) db.users = [];
    db.users.push(user);
    writeFallbackDb(db);
    return user;
  },

  async getProfile(userId) {
    return await dbService.getProfile(userId);
  },

  async saveProfile(userId, profileData) {
    return await dbService.saveProfile(userId, profileData);
  }
};
