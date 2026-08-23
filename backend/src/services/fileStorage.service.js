import { logger } from '../utils/logger.js';

export const fileStorageService = {
  async uploadFile(userId, fileBuffer, fileName, mimeType) {
    logger.info(`Storing file ${fileName} for user ${userId}`);
    return {
      fileId: `file_${Date.now()}`,
      url: `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
      fileName
    };
  }
};
