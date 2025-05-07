/**
 * Utility function to check if a message content is a post share
 * @param content The message content to check
 * @returns boolean indicating if the content is a shared post
 */
export const isPostShare = (content: string | object): boolean => {
  // Quick check first
  if (typeof content !== 'string') return false;
  
  // Check if the message has the pattern for shared posts
  const hasPostSignature = content.includes('"_id":"') && 
                         content.includes('"author":"') &&
                         content.includes('"data":') && 
                         content.includes('"feedId":');
  
  if (!hasPostSignature) return false;
  
  // Try to parse it to verify it's valid JSON
  try {
    const parsed = JSON.parse(content);
    return parsed && 
           parsed._id && 
           parsed.data && 
           typeof parsed.data === 'object';
  } catch (e) {
    console.error("Failed to parse potential shared post:", e);
    return false;
  }
};

/**
 * Parse a potential post share content into a structured object
 * @param content The message content to parse
 * @returns The parsed post object or null if parsing fails
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parsePostShare = (content: string): any => {
  if (!isPostShare(content)) return null;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse shared post:", e);
    return null;
  }
};

/**
 * Utility function to check if a message content is a story reply
 * @param content The message content to check
 * @returns boolean indicating if the content is a story reply
 */
export const isStoryReply = (content: string | object): boolean => {
  // Quick check first
  if (typeof content !== 'string') return false;
  
  // Check if the message has the pattern for story replies
  const hasStorySignature = content.includes('"entityId":"') && 
                          content.includes('"entity":') &&
                          content.includes('"storyReply":true');
  
  if (!hasStorySignature) return false;
  
  // Try to parse it to verify it's valid JSON
  try {
    const parsed = JSON.parse(content);
    return parsed && 
           parsed.entity && 
           parsed.entity.storyReply === true;
  } catch (e) {
    console.error("Failed to parse potential story reply:", e);
    return false;
  }
};

/**
 * Parse a potential story reply content into a structured object
 * @param content The message content to parse
 * @returns The parsed story reply object or null if parsing fails
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseStoryReply = (content: string): any => {
  if (!isStoryReply(content)) return null;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse story reply:", e);
    return null;
  }
}; 