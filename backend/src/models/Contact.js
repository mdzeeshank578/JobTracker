export function createContactEntity(data) {
  return {
    id: data.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: data.user_id || data.userId,
    name: data.name || '',
    email: data.email || '',
    company: data.company || '',
    role: data.role || 'Recruiter',
    linkedin_url: data.linkedin_url || data.linkedinUrl || '',
    created_at: new Date().toISOString()
  };
}
