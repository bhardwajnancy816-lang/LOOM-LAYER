/**
 * Pattern Image Upload Validation & Formatting Utilities
 * 
 * Supports PNG, JPG/JPEG, and SVG files up to 10 MB.
 * Prepares metadata structures for future AI Contour & Shape Recognition.
 */

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml'
];
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

/**
 * Formats byte size into human-readable string (e.g. "2.4 MB", "450 KB")
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates file object or metadata against allowed formats and size limits
 */
export function validatePatternImageFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: 'No file selected. Please choose a valid image file.'
    };
  }

  const fileName = file.name || '';
  const fileType = (file.type || '').toLowerCase();
  const fileSize = typeof file.size === 'number' ? file.size : 0;

  // Check file extension
  const extensionMatch = fileName.toLowerCase().match(/\.[0-9a-z]+$/);
  const fileExt = extensionMatch ? extensionMatch[0] : '';

  // Explicit handling for CAD / DXF import
  if (fileExt === '.dxf' || fileExt === '.dwg' || fileType.includes('dxf')) {
    return {
      isValid: false,
      isCadFile: true,
      error: 'CAD / DXF vector import is an upcoming capability planned for a future release. Currently, please upload SVG, PNG, or JPG pattern outlines or define pieces manually.'
    };
  }

  const isMimeAllowed = ALLOWED_IMAGE_MIME_TYPES.includes(fileType);
  const isExtAllowed = ALLOWED_IMAGE_EXTENSIONS.includes(fileExt);

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      isValid: false,
      error: `Unsupported file format (${fileExt || fileType || 'unknown'}). Allowed formats: PNG, JPG, JPEG, SVG.`
    };
  }

  // Check size limit (10 MB)
  if (fileSize > MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(fileSize)}) exceeds the maximum allowed limit of 10 MB.`
    };
  }

  // Determine clean friendly type
  let cleanType = 'PNG';
  if (fileType.includes('svg') || fileExt === '.svg') {
    cleanType = 'SVG';
  } else if (fileType.includes('jpeg') || fileType.includes('jpg') || fileExt === '.jpg' || fileExt === '.jpeg') {
    cleanType = 'JPG';
  }

  return {
    isValid: true,
    error: null,
    fileInfo: {
      name: fileName,
      type: cleanType,
      mimeType: fileType || (cleanType === 'SVG' ? 'image/svg+xml' : cleanType === 'JPG' ? 'image/jpeg' : 'image/png'),
      size: fileSize,
      formattedSize: formatFileSize(fileSize)
    }
  };
}

/**
 * Helper to read a browser File as Data URL (Base64)
 */
export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
