import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';

export const authService = {
  async register(email, rawPassword, displayName) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new ApiError(400, 'An account already exists with this email address.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(rawPassword, salt, 1000, 64, 'sha512').toString('hex');
    const id = `user_${cleanEmail.replace(/[^a-z0-9]/g, '')}`;

    const user = await userRepository.create({
      id,
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      salt,
      hash
    });

    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      created_at: user.created_at
    };
  },

  async login(email, rawPassword) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await userRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new ApiError(404, 'Account not found for this email address.');
    }

    let isValid = false;
    if (user.hash && user.salt) {
      const checkHash = crypto.pbkdf2Sync(rawPassword, user.salt, 1000, 64, 'sha512').toString('hex');
      isValid = (checkHash === user.hash);
    } else if (user.password) {
      isValid = (user.password === rawPassword);
    }

    if (!isValid) {
      throw new ApiError(401, 'Incorrect password.');
    }

    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0]
    };
  }
};
