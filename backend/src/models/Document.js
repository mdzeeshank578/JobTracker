export function createDocumentEntity(data) {
  return {
    id: data.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: data.user_id || data.userId,
    title: data.title || 'Untitled Document',
    file_name: data.file_name || data.fileName || 'document.pdf',
    file_url: data.file_url || data.fileUrl || '',
    file_type: data.file_type || data.fileType || 'application/pdf',
    created_at: new Date().toISOString()
  };
}
