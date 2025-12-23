/**
 * Microsoft Graph API Service
 * Handles authentication and SharePoint/OneDrive operations
 * Uses PKCE flow for secure authentication without client secret
 */

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const AUTH_BASE = 'https://login.microsoftonline.com';

// Get config from environment
export const getAzureConfig = () => ({
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID || '',
  redirectUri: `${window.location.origin}/auth/microsoft/callback`,
  scopes: ['User.Read', 'Files.ReadWrite.All', 'Sites.ReadWrite.All', 'offline_access'],
});

/**
 * Check if Azure is configured
 */
export function isAzureConfigured() {
  const config = getAzureConfig();
  return !!(config.clientId && config.tenantId);
}

/**
 * Generate a random string for PKCE
 */
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('');
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE() {
  const codeVerifier = generateRandomString(64);

  // Generate code challenge using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Base64 URL encode
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge };
}

/**
 * Start Microsoft OAuth flow with PKCE
 * Opens a popup window for authentication
 */
export async function startMicrosoftAuth() {
  const config = getAzureConfig();

  if (!config.clientId || !config.tenantId) {
    throw new Error('Azure nincs konfigurálva. Add meg a VITE_AZURE_CLIENT_ID és VITE_AZURE_TENANT_ID értékeket.');
  }

  // Generate PKCE values
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Store code verifier for later use
  sessionStorage.setItem('ms_code_verifier', codeVerifier);

  // Generate state for CSRF protection
  const state = generateRandomString(32);
  sessionStorage.setItem('ms_auth_state', state);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    response_mode: 'query',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account', // Always show account picker
  });

  const authUrl = `${AUTH_BASE}/${config.tenantId}/oauth2/v2.0/authorize?${params}`;

  // Open popup
  const width = 500;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    authUrl,
    'microsoft-auth',
    `width=${width},height=${height},left=${left},top=${top},popup=1`
  );

  if (!popup) {
    throw new Error('Popup blokkolva! Engedélyezd a popup-okat ehhez az oldalhoz.');
  }

  // Return a promise that resolves when auth is complete
  return new Promise((resolve, reject) => {
    // Listen for the callback
    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'microsoft-auth-callback') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkInterval);

        if (event.data.error) {
          reject(new Error(event.data.error_description || event.data.error));
        } else if (event.data.code) {
          try {
            const tokens = await exchangeCodeForTokens(event.data.code);
            resolve(tokens);
          } catch (err) {
            reject(err);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without completing auth
    const checkInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkInterval);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Bejelentkezés megszakítva'));
      }
    }, 500);
  });
}

/**
 * Exchange authorization code for tokens (PKCE flow)
 */
export async function exchangeCodeForTokens(code) {
  const config = getAzureConfig();
  const codeVerifier = sessionStorage.getItem('ms_code_verifier');

  if (!codeVerifier) {
    throw new Error('PKCE code verifier not found');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${AUTH_BASE}/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Token exchange failed');
  }

  const tokens = await response.json();

  // Clean up
  sessionStorage.removeItem('ms_code_verifier');
  sessionStorage.removeItem('ms_auth_state');

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken) {
  const config = getAzureConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: config.scopes.join(' '),
  });

  const response = await fetch(`${AUTH_BASE}/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Token refresh failed');
  }

  const tokens = await response.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn: tokens.expires_in,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
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
   * Get folder by path
   */
  async getFolderByPath(path) {
    const encodedPath = encodeURIComponent(path);
    return this.request(`/me/drive/root:/${encodedPath}`);
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
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      try {
        // Try to get the folder
        await this.getFolderByPath(currentPath);
      } catch {
        // Folder doesn't exist, create it
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        let parentId = 'root';

        if (parentPath) {
          const parent = await this.getFolderByPath(parentPath);
          parentId = parent.id;
        }

        await this.createFolder(parentId, part);
      }
    }

    // Return the final folder
    return this.getFolderByPath(path);
  }

  /**
   * Upload file (small files < 4MB)
   */
  async uploadFile(folderPath, fileName, content, contentType) {
    const fullPath = `${folderPath}/${fileName}`.replace(/^\//, '');
    const encodedPath = encodeURIComponent(fullPath).replace(/%2F/g, '/');

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/root:/${encodedPath}:/content`, {
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
  async uploadLargeFile(folderPath, fileName, file, onProgress) {
    const fullPath = `${folderPath}/${fileName}`.replace(/^\//, '');
    const encodedPath = encodeURIComponent(fullPath).replace(/%2F/g, '/');

    // Create upload session
    const session = await this.request(`/me/drive/root:/${encodedPath}:/createUploadSession`, {
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
   * Get file by path
   */
  async getFileByPath(path) {
    const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
    return this.request(`/me/drive/root:/${encodedPath}`);
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
  const yearPath = `${basePath}/${topicName}/${year}`;

  // Ensure the full path exists
  const folder = await client.ensureFolderPath(yearPath);

  return {
    folderId: folder.id,
    path: `/${yearPath}`,
    webUrl: folder.webUrl,
  };
}

/**
 * Sync documents from SharePoint to database
 * Scans the folder structure and returns document metadata
 */
export async function syncDocumentsFromSharePoint(client) {
  const basePath = 'PepperHouse Documents';
  const documents = [];

  try {
    // Get the base folder
    const baseFolder = await client.getFolderByPath(basePath);

    // Get all topics (first level folders)
    const topics = await client.listFolder(baseFolder.id);

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
    // Base folder doesn't exist yet, return empty
    if (error.message?.includes('404') || error.message?.includes('itemNotFound')) {
      return [];
    }
    throw error;
  }
}
