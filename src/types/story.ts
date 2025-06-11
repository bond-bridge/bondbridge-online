export interface StoryItem {
    _id: string;
    author: string;
    privacy: number;
    contentType: string;
    taggedUsers: string[] | null;
    hideFrom: string[];
    createdAt: number;
    url: string;
    status: number;
    ago_time: string;
    seen: number;
} 
  
export interface StoryUser {
    user: string;
    userId: string;
    avatar: string;
    hasStory: boolean;
    stories: StoryItem[];
    latestStoryTime: number;
}

export interface StoryProps {
    user: string;
    userId: string;
    avatar: string;
    profilePic?: string;
    hasStory: boolean;
    stories: Array<{
      _id: string;
      author: string;
      privacy: number;
      contentType: string;
      taggedUsers: string[] | null;
      hideFrom: string[];
      createdAt: number;
      url: string;
      status: number;
      ago_time: string;
      seen: number;
    }>;
    latestStoryTime: number;
    defaultRingColor?: string;
    unseenRingColor?: string;
    allStories?: StoryUser[]; // All stories from the homepage
    storyIndex?: number; // Index of this story in the allStories array
    usernameLengthLimit?: number; // Maximum length for username display
  }