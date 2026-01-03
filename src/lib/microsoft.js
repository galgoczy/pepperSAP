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

  // ============================================
  // EXCEL WORKBOOK OPERATIONS
  // ============================================

  /**
   * Get Excel workbook worksheets list
   * @param {string} itemId - The file item ID
   */
  async getExcelWorksheets(itemId) {
    return this.request(`/me/drive/items/${itemId}/workbook/worksheets`);
  }

  /**
   * Get Excel worksheet by name
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet
   */
  async getExcelWorksheet(itemId, worksheetName) {
    const encodedName = encodeURIComponent(worksheetName);
    return this.request(`/me/drive/items/${itemId}/workbook/worksheets('${encodedName}')`);
  }

  /**
   * Get Excel range data
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet
   * @param {string} range - Range in A1 notation (e.g., 'A1:Z100')
   */
  async getExcelRange(itemId, worksheetName, range) {
    const encodedName = encodeURIComponent(worksheetName);
    return this.request(
      `/me/drive/items/${itemId}/workbook/worksheets('${encodedName}')/range(address='${range}')`
    );
  }

  /**
   * Get Excel used range (all data in worksheet)
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet
   */
  async getExcelUsedRange(itemId, worksheetName) {
    const encodedName = encodeURIComponent(worksheetName);
    return this.request(
      `/me/drive/items/${itemId}/workbook/worksheets('${encodedName}')/usedRange`
    );
  }

  /**
   * Find a value in Excel and get its cell address
   * Searches through the used range for a matching value
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet
   * @param {string} searchValue - Value to search for
   * @returns {object} - {row, column, address} or null if not found
   */
  async findExcelCell(itemId, worksheetName, searchValue) {
    const usedRange = await this.getExcelUsedRange(itemId, worksheetName);
    const values = usedRange.values;
    const searchLower = searchValue.toLowerCase();

    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const cellValue = values[row][col];
        if (cellValue && String(cellValue).toLowerCase().includes(searchLower)) {
          // Convert to Excel address (A1 notation)
          const colLetter = this.columnToLetter(col);
          const rowNum = row + 1;
          return {
            row,
            column: col,
            address: `${colLetter}${rowNum}`,
            value: cellValue,
          };
        }
      }
    }
    return null;
  }

  /**
   * Get cell value relative to a found cell
   * @param {Array} values - 2D array of values from getExcelUsedRange
   * @param {number} baseRow - Base row index
   * @param {number} baseCol - Base column index
   * @param {number} rowOffset - Rows to move (positive = down)
   * @param {number} colOffset - Columns to move (positive = right)
   */
  getRelativeCell(values, baseRow, baseCol, rowOffset = 0, colOffset = 0) {
    const targetRow = baseRow + rowOffset;
    const targetCol = baseCol + colOffset;

    if (targetRow >= 0 && targetRow < values.length &&
        targetCol >= 0 && targetCol < values[targetRow].length) {
      return values[targetRow][targetCol];
    }
    return null;
  }

  /**
   * Convert column index to letter (0 = A, 1 = B, etc.)
   */
  columnToLetter(col) {
    let letter = '';
    while (col >= 0) {
      letter = String.fromCharCode((col % 26) + 65) + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  }

  /**
   * Convert letter to column index (A = 0, B = 1, etc.)
   */
  letterToColumn(letter) {
    let col = 0;
    for (let i = 0; i < letter.length; i++) {
      col = col * 26 + (letter.charCodeAt(i) - 64);
    }
    return col - 1;
  }

  /**
   * Read monthly data from Excel file (legacy single-section format)
   * Searches for month name in headers and unit name in rows
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet
   * @param {string} monthName - Month to search for (e.g., 'Január', '2025-01')
   * @param {Array} unitNames - List of unit names to search for
   * @param {number} dataColumnOffset - Offset from month column to data (default 0)
   */
  async readMonthlyExcelData(itemId, worksheetName, monthName, unitNames, dataColumnOffset = 0) {
    const usedRange = await this.getExcelUsedRange(itemId, worksheetName);
    const values = usedRange.values;
    const results = {};

    // Find month column in first few rows (header area)
    let monthCol = -1;
    for (let row = 0; row < Math.min(5, values.length); row++) {
      for (let col = 0; col < values[row].length; col++) {
        const cellValue = String(values[row][col] || '').toLowerCase();
        if (cellValue.includes(monthName.toLowerCase())) {
          monthCol = col + dataColumnOffset;
          break;
        }
      }
      if (monthCol >= 0) break;
    }

    if (monthCol < 0) {
      throw new Error(`Hónap nem található: ${monthName}`);
    }

    // Find each unit row and get value from month column
    for (const unitName of unitNames) {
      const unitLower = unitName.toLowerCase();

      for (let row = 0; row < values.length; row++) {
        const firstCellValue = String(values[row][0] || '').toLowerCase();
        if (firstCellValue.includes(unitLower)) {
          const value = values[row][monthCol];
          results[unitName] = typeof value === 'number' ? value : parseFloat(value) || 0;
          break;
        }
      }
    }

    return results;
  }

  /**
   * Read monthly expense data from Excel file with 3 sections
   * Structure: Sections (utalásos költségek, Rezsi, eszközbeszerzés) with months as rows, units as columns
   * @param {string} itemId - The file item ID
   * @param {string} worksheetName - Name of the worksheet (e.g., 'Összesítő')
   * @param {string} monthName - Month to search for (e.g., 'december')
   * @returns {object} - { unitName: { transfer_expenses, rent_utilities, equipment_expenses } }
   */
  async readMonthlyExpensesFromExcel(itemId, worksheetName, monthName) {
    const usedRange = await this.getExcelUsedRange(itemId, worksheetName);
    const values = usedRange.values;
    const results = {};

    // Section headers to find
    const sections = {
      'utalásos költségek': 'transfer_expenses',
      'rezsi': 'rent_utilities',
      'eszközbeszerzés': 'equipment_expenses',
    };

    // Find header row with unit names (first row typically)
    // Header format: [category_label, K00, KR, MÁK, Knorr69, Knorr86, Knorr105, RSR, KTI, Pepsi, K0]
    const headerRow = values[0] || [];
    const unitColumns = {}; // { unitName: columnIndex }

    for (let col = 1; col < headerRow.length; col++) {
      const cellValue = String(headerRow[col] || '').trim();
      if (cellValue) {
        unitColumns[cellValue] = col;
        // Initialize result object for this unit
        results[cellValue] = {
          transfer_expenses: 0,
          rent_utilities: 0,
          equipment_expenses: 0,
        };
      }
    }

    // Find each section and read the month row
    const monthLower = monthName.toLowerCase();
    let currentSection = null;

    for (let row = 0; row < values.length; row++) {
      const firstCell = String(values[row][0] || '').trim().toLowerCase();

      // Check if this is a section header
      for (const [sectionName, fieldName] of Object.entries(sections)) {
        if (firstCell === sectionName || firstCell.includes(sectionName)) {
          currentSection = fieldName;
          break;
        }
      }

      // Check if this is the target month row within a section
      if (currentSection && firstCell === monthLower) {
        // Read values for each unit from this row
        for (const [unitName, colIndex] of Object.entries(unitColumns)) {
          const cellValue = values[row][colIndex];
          let numValue = 0;

          if (typeof cellValue === 'number') {
            numValue = cellValue;
          } else if (typeof cellValue === 'string') {
            // Parse Hungarian number format (e.g., "156 204 Ft" or "1 273 953 Ft")
            const cleaned = cellValue.replace(/[^\d,-]/g, '').replace(',', '.');
            numValue = parseFloat(cleaned) || 0;
          }

          if (results[unitName]) {
            results[unitName][currentSection] = numValue;
          }
        }

        // Reset section after reading (prepare for next section's month row)
        currentSection = null;
      }
    }

    return results;
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
