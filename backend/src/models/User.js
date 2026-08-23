export function createUserEntity(data) {
  return {
    id: data.id || data._id || `user_${Date.now()}`,
    name: data.name || data.displayName || '',
    email: (data.email || '').toLowerCase().trim(),
    passwordHash: data.passwordHash || data.hash || null,
    salt: data.salt || null,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
  };
}
