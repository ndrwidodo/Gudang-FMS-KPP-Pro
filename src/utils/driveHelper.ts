/**
 * Helper to process Google Drive URLs and extract previewable image links
 */

export const DRIVE_UPLOAD_FOLDER_URL =
  'https://drive.google.com/drive/folders/1w72vnBTB1PFZeF1Br36rHDv5_mCmb0aG?usp=sharing';

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern: /file/d/{id}/...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return matchFileD[1];
  }

  // Pattern: ?id={id} or &id={id}
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    return matchIdParam[1];
  }

  // Pattern: /folders/{id}
  const matchFolder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolder && matchFolder[1]) {
    return matchFolder[1];
  }

  // If raw ID was pasted
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function getDirectDriveImageUrl(urlOrId?: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();

  // If it's already an external data url, blob, or standard http image not from drive
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const id = extractDriveFileId(trimmed);
  if (id) {
    // High-reliability Google Usercontent CDN link or thumbnail endpoint
    return `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
  }

  return trimmed;
}

export function isGoogleDriveUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('googleusercontent.com');
}
