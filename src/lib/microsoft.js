/**
 * Microsoft Graph API Service
 * Handles authentication and SharePoint/OneDrive operations
 */

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const AUTH_BASE = 'https://login.microsoftonline.com';

// Get config from environment
const getConfig = () => ({
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID,
  redirectUri: `${window.location.origin}/auth/microsoft/callback`,
  scopes: ['User.Read', 'Files.ReadWrite.All', 'Sites.ReadWrite.All', 'offline_access'],
});

/**
 * Generate Microsoft OAuth login URL
 */
export function getMicrosoftLoginUrl(state = '') {
  const config = getConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    response_mode: 'query',
    state: state,
  });

  return `${AUTH_BASE}/${config.tenantId}/oauth2/v2.0/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens (should be done server-side in production)
 * This is a simplified version - in production, use Supabase Edge Functions
 */
export async function exchangeCodeForTokens(code) {
  const config = getConfig();

  // In production, this should be an Edge Function call
  // For now, we'll need to implement this as a Supabase Edge Function
  throw new Error('Token exchange must be done server-side. Use Supabase Edge Function.');
}

/**
 * Microsoft Graph API client
 */
export class MicrosoftGraphClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Graph API error: ${response.status}`);
    }

    // Handle no content responses
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  /**
   * Get current user info
   */
  async getMe() {
    return this.request('/me');
  }

  /**
   * Get user's OneDrive root
   */
  async getDriveRoot() {
    return this.request('/me/drive/root');
  }

  /**
   * Get drive ID
   */
  async getDriveId() {
    const drive = await this.request('/me/drive');
    return drive.id;
  }

  /**
   * List items in a folder
   */
  async listFolder(folderId = 'root') {
    const path = folderId === 'root' ? '/me/drive/root/children' : `/me/drive/items/${folderId}/children`;
    return this.request(path);
  }

  /**
   * Create folder
   */
  async createFolder(parentId, folderName) {
    const path = parentId === 'root'
      ? '/me/drive/root/children'
      : `/me/drive/items/${parentId}/children`;

    return this.request(path, {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    });
  }

  /**
   * Create folder by path (creates parent folders if needed)
   */
  async ensureFolderPath(path) {
    // Remove leading/trailing slashes and split
    const parts = path.replace(/^\/|\/$/g, '').split('/');
    let currentId = 'root';

    for (const part of parts) {
      try {
        // Try to get the folder
        const result = await this.request(`/me/drive/items/${currentId}:/${part}`);
        currentId = result.id;
      } catch (error) {
        // Folder doesn't exist, create it
        const newFolder = await this.createFolder(currentId, part);
        currentId = newFolder.id;
      }
    }

    return currentId;
  }

  /**
   * Upload file (small files < 4MB)
   */
  async uploadFile(folderId, fileName, content, contentType) {
    const path = folderId === 'root'
      ? `/me/drive/root:/${fileName}:/content`
      : `/me/drive/items/${folderId}:/${fileName}:/content`;

    const response = await fetch(`${GRAPH_API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: content,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload large file using upload session
   */
  async uploadLargeFile(folderId, fileName, file, onProgress) {
    // Create upload session
    const path = folderId === 'root'
      ? `/me/drive/root:/${fileName}:/createUploadSession`
      : `/me/drive/items/${folderId}:/${fileName}:/createUploadSession`;

    const session = await this.request(path, {
      method: 'POST',
      body: JSON.stringify({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
        },
      }),
    });

    const uploadUrl = session.uploadUrl;
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const fileSize = file.size;
    let offset = 0;

    while (offset < fileSize) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, fileSize));
      const chunkEnd = Math.min(offset + chunkSize, fileSize) - 1;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.size.toString(),
          'Content-Range': `bytes ${offset}-${chunkEnd}/${fileSize}`,
        },
        body: chunk,
      });

      if (!response.ok && response.status !== 202) {
        throw new Error(`Upload chunk failed: ${response.status}`);
      }

      offset += chunkSize;

      if (onProgress) {
        onProgress(Math.min(100, Math.round((offset / fileSize) * 100)));
      }

      // If complete, return the file metadata
      if (response.status === 200 || response.status === 201) {
        return response.json();
      }
    }
  }

  /**
   * Get file metadata
   */
  async getFile(itemId) {
    return this.request(`/me/drive/items/${itemId}`);
  }

  /**
   * Get file content (download URL)
   */
  async getFileDownloadUrl(itemId) {
    const file = await this.request(`/me/drive/items/${itemId}`);
    return file['@microsoft.graph.downloadUrl'];
  }

  /**
   * Delete file
   */
  async deleteFile(itemId) {
    return this.request(`/me/drive/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search files
   */
  async searchFiles(query) {
    return this.request(`/me/drive/root/search(q='${encodeURIComponent(query)}')`);
  }

  /**
   * Get shared link
   */
  async createSharingLink(itemId, type = 'view', scope = 'organization') {
    return this.request(`/me/drive/items/${itemId}/createLink`, {
      method: 'POST',
      body: JSON.stringify({ type, scope }),
    });
  }
}

/**
 * Document folder structure helper
 * Creates the standard folder structure: /PepperHouse Documents/{Topic}/{Year}
 */
export async function ensureDocumentFolders(client, topicName, year) {
  const basePath = 'PepperHouse Documents';
  const topicPath = `${basePath}/${topicName}`;
  const yearPath = `${topicPath}/${year}`;

  // Ensure the full path exists
  const folderId = await client.ensureFolderPath(yearPath);
  return {
    folderId,
    path: `/${yearPath}`,
  };
}

/**
 * Sync documents from SharePoint to database
 * Scans the folder structure and updates the database
 */
export async function syncDocumentsFromSharePoint(client, supabase) {
  const basePath = 'PepperHouse Documents';

  try {
    // Get the base folder
    const baseFolder = await client.request(`/me/drive/root:/${basePath}`);

    // Get all topics (first level folders)
    const topics = await client.listFolder(baseFolder.id);

    const documents = [];

    for (const topicFolder of topics.value || []) {
      if (!topicFolder.folder) continue; // Skip files

      const topicName = topicFolder.name;

      // Get years (second level folders)
      const years = await client.listFolder(topicFolder.id);

      for (const yearFolder of years.value || []) {
        if (!yearFolder.folder) continue;

        const year = parseInt(yearFolder.name, 10);
        if (isNaN(year)) continue;

        // Get files in year folder
        const files = await client.listFolder(yearFolder.id);

        for (const file of files.value || []) {
          if (file.folder) continue; // Skip folders

          documents.push({
            sharepoint_item_id: file.id,
            sharepoint_drive_id: baseFolder.parentReference?.driveId,
            sharepoint_path: `/${basePath}/${topicName}/${year}/${file.name}`,
            sharepoint_web_url: file.webUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.file?.mimeType,
            year: year,
            topic_name: topicName,
            last_modified: file.lastModifiedDateTime,
          });
        }
      }
    }

    return documents;
  } catch (error) {
    console.error('Error syncing from SharePoint:', error);
    throw error;
  }
}
