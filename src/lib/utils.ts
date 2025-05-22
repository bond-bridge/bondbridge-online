import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function exceededCharLimit(text: string, limit: number): boolean {
  return countCharacters(text) > limit;
}

/**
 * Converts a timestamp to a relative time string (e.g., "2m ago", "3h ago", "5d ago")
 * @param timestamp - ISO string or Date object
 * @returns A human-readable relative time string
 */
export function getRelativeTime(timestamp: string | Date): string {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) {
    return 'Just now';
  }
  
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) {
    return `Just now`;
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else if (weeks < 5) {
    return `${weeks}w ago`;
  } else if (months < 12) {
    return `${months}mo ago`;
  } else {
    return `${years}y ago`;
  }
}

/**
 * Truncates text based on character length, ensuring we don't cut in the middle of a word
 * @param text - The text to truncate
 * @param limit - Maximum character length
 * @returns Truncated text or original if within limit
 */
export function truncateText(text: string, limit: number): { 
  text: string;
  isTruncated: boolean; 
} {
  if (!text || text.length <= limit) {
    return { text, isTruncated: false };
  }
  
  // Find a space to truncate at
  let truncateIndex = text.lastIndexOf(' ', limit);
  if (truncateIndex === -1) truncateIndex = limit;
  
  return { 
    text: text.substring(0, truncateIndex) + '...', 
    isTruncated: true 
  };
}