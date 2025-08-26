export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

export interface DriveApiResponse {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

/**
 * Fetch files from Google Drive
 * @param accessToken - Google OAuth access token
 * @param pageSize - Number of files to retrieve (default: 10, max: 1000)
 * @param pageToken - Token for pagination
 * @param query - Search query (optional)
 * @returns Promise with drive files data
 */
export const fetchDriveFiles = async (
  accessToken: string,
  pageSize: number = 10,
  pageToken?: string,
  query?: string
): Promise<DriveApiResponse> => {
  try {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents),nextPageToken,incompleteSearch',
      orderBy: 'modifiedTime desc'
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    if (query) {
      params.append('q', query);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Drive files: ${response.status} ${response.statusText}`);
    }

    const data: DriveApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    throw error;
  }
};

/**
 * Download a file from Google Drive
 * @param accessToken - Google OAuth access token
 * @param fileId - ID of the file to download
 * @param fileName - Name to use for the downloaded file
 */
export const downloadDriveFile = async (
  accessToken: string,
  fileId: string,
  fileName: string
): Promise<void> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Get file metadata from Google Drive
 * @param accessToken - Google OAuth access token
 * @param fileId - ID of the file
 * @returns Promise with file metadata
 */
export const getDriveFileMetadata = async (
  accessToken: string,
  fileId: string
): Promise<DriveFile> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file metadata: ${response.status} ${response.statusText}`);
    }

    const data: DriveFile = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    throw error;
  }
};

/**
 * Search files in Google Drive
 * @param accessToken - Google OAuth access token
 * @param searchQuery - Search query string
 * @param pageSize - Number of results to return
 * @returns Promise with search results
 */
export const searchDriveFiles = async (
  accessToken: string,
  searchQuery: string,
  pageSize: number = 10
): Promise<DriveApiResponse> => {
  // Build the query string for Google Drive API
  const query = `name contains '${searchQuery}' or fullText contains '${searchQuery}'`;
  
  return fetchDriveFiles(accessToken, pageSize, undefined, query);
};

/**
 * Get files from a specific folder
 * @param accessToken - Google OAuth access token
 * @param folderId - ID of the folder
 * @param pageSize - Number of files to retrieve
 * @returns Promise with folder contents
 */
export const getFolderContents = async (
  accessToken: string,
  folderId: string,
  pageSize: number = 10
): Promise<DriveApiResponse> => {
  const query = `'${folderId}' in parents and trashed=false`;
  
  return fetchDriveFiles(accessToken, pageSize, undefined, query);
};

/**
 * Get file icon emoji based on MIME type
 * @param mimeType - File MIME type
 * @returns Emoji representing the file type
 */
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('folder')) return '📁';
  if (mimeType.includes('document')) return '📄';
  if (mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎥';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️';
  if (mimeType.includes('text')) return '📝';
  return '📎';
};

/**
 * Format file size in human readable format
 * @param sizeInBytes - File size in bytes
 * @returns Formatted size string
 */
export const formatFileSize = (sizeInBytes: string | undefined): string => {
  if (!sizeInBytes) return 'Unknown size';
  
  const bytes = parseInt(sizeInBytes);
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(1);
  
  return `${size} ${sizes[i]}`;
};

/**
 * Upload a file to Google Drive
 * @param accessToken - Google OAuth access token
 * @param file - File object to upload
 * @param folderId - Optional folder ID to upload to
 * @param onProgress - Optional progress callback
 * @returns Promise with uploaded file metadata
 */
export const uploadFileToDrive = async (
  accessToken: string,
  file: File,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<DriveFile> => {
  try {
    const metadata = {
      name: file.name,
      ...(folderId && { parents: [folderId] })
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(form);
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Create a folder in Google Drive
 * @param accessToken - Google OAuth access token
 * @param folderName - Name of the folder to create
 * @param parentFolderId - Optional parent folder ID
 * @returns Promise with created folder metadata
 */
export const createDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFile> => {
  try {
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId && { parents: [parentFolderId] })
    };

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.status} ${response.statusText}`);
    }

    const data: DriveFile = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Drive
 * @param accessToken - Google OAuth access token
 * @param fileId - ID of the file to delete
 * @returns Promise that resolves when file is deleted
 */
export const deleteDriveFile = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Required scopes for Google Drive API
 */
export const DRIVE_SCOPES = {
  // Read-only access to files
  READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  // Full access to files
  FULL: 'https://www.googleapis.com/auth/drive',
  // Access to file metadata only
  METADATA: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  // Access to app-created files only
  APPDATA: 'https://www.googleapis.com/auth/drive.appdata'
};
