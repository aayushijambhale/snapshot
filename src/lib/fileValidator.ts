import { toast } from 'sonner';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(file: File): ValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      message: `Invalid file type: ${file.type}. Please upload JPG, PNG or WEBP.`
    };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      isValid: false,
      message: `File too large: ${fileSizeMB.toFixed(2)}MB. Max size is ${MAX_FILE_SIZE_MB}MB.`
    };
  }

  return { isValid: true };
}

export function validateMultipleImages(files: File[]): ValidationResult {
  for (const file of files) {
    const result = validateImage(file);
    if (!result.isValid) return result;
  }
  return { isValid: true };
}
