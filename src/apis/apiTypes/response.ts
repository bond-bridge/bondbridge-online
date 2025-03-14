// Base API response interface
export interface ApiResponse<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

// OTP response interfaces
export type SendOTPResponse = ApiResponse<{
  message: string;
  expiresIn: number;
}>;

export type VerifyOTPResponse = {
  verified: boolean;
  token: string;
  message: string;
  userDetails: {
    _id: string;
    phoneNumber: string;
    countryCode: string;
  };
};

// Login response interface
export type LoginResponse = {
  token: string;
  message: string;
  userDetails: {
    statusCode: number;
    _id: string;
    phoneNumber: string;
    countryCode: string;
    // Add other user fields as needed
  };
};

// Password reset responses (for future use)
export type RequestPasswordResetResponse = ApiResponse<{
  message: string;
  expiresIn: number;
}>;

export type ResetPasswordResponse = ApiResponse<{
  message: string;
}>;

export type SetPasswordResponse = {
  success: boolean;
  message: string;
};

export interface AvatarItem {
  url: string;
  type: string;
}

export interface AvatarUrls {
  male: AvatarItem[];
  female: AvatarItem[];
}

export type CreateProfileResponse = ApiResponse<{
  user: {
    statusCode: number;
    userId: string;
    _id: string;
    name: string;
    email: string;
    avatar: string;
    interests: string[];
  };
}>;

export type FetchAvatarsResponse = {
  success: boolean;
  message?: string;
  URLS: {
    male: AvatarItem[];
    female: AvatarItem[];
  }
}

export interface CommentData {
  commentId: string;
  postId: string;
  parentComment: string | null;
  comment: string;
  createdAt: string;
  agoTime: string;
  user: {
    userId: string;
    name: string;
    profilePic: string;
  };
  likes: number;
  hasReplies: boolean;
  replies?: CommentData[];
}

export interface PostData {
  user: string;
  avatar: string;
  caption: string;
  image: string;
  likes: number;
  comments: number;
  datePosted: string;
}

export interface FetchCommentsResponse {
  hasMoreComments: boolean;
  success: boolean;
  message?: string;
  comments: CommentData[];
  post?: PostData;
}

export interface PostCommentResponse {
  success: boolean;
  message?: string;
  cmment?: object;
}

export interface HomePostData {
  _id: string;
  author: string;
  whoCanComment: number;
  privacy: number;
  content_type: string | null;
  taggedUsers: string[] | null;
  hideFrom: string[] | null;
  status: number;
  createdAt: number;
  data: {
    content: string;
    media: Array<{
      url: string;
      type: string;
    }>;
  };
  feedId: string;
  weekIndex: string;
  userId: string;
  ago_time: string;
  commentCount: number;
  reactionCount: number;
  reaction: {
    hasReacted: boolean;
    reactionType: string | null;
  };
  name: string;
  profilePic: string;
}

export interface StoryData {
  userId: string;
  name: string;
  profilePic: string;
  isLive: boolean;
  hasStory: boolean;
  latestStoryTime: number;
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
  channelName: string | null;
}

export interface HomepageResponse {
  success: boolean;
  postsData: {
    success: boolean;
    posts: HomePostData[];
    hasMore: boolean;
    message: string;
  };
  storiesData: {
    success: boolean;
    stories: StoryData[];
    message: string;
  };
}

export interface FriendRequest {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface AcceptFriendRequestResponse {
  success: boolean;
  message?: string;
}

export interface RejectFriendRequestResponse {
  success: boolean;
  message?: string;
}

export interface FetchFriendRequestsResponse {
  success: boolean;
  message?: string;
  data: {
    requests: FriendRequest[];
    hasMore: boolean;
    totalCount: number;
  };
}

export interface SendFriendRequestResponse {
  success: boolean;
  message?: string;
}

export interface Person {
  id: string;
  name: string;
  bio: string;
  avatar: string;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  users: Person[];
}

export interface Notification {
  id: number;
  title: string;
  description: string;
  avatar: string;
  timestamp: string;
  seen: boolean;
}

export interface FollowRequest {
  _id: string;
  mobileNumber: string;
  countryCode: string;
  nickName: string;
  statusCode: number;
  privacyLevel: number;
  avatar: string;
  email: string;
  entityType: string;
  interests: string[];
  name: string;
  profilePic: string;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  notifications: Notification[];
}

export interface FollowRequestsResponse {
  success: boolean;
  message: string;
  result: FollowRequest[];
}

// Add missing response types for homepage API
export interface FetchPostsResponse {
  success: boolean;
  message: string;
  posts: HomePostData[];
  hasMore: boolean;
}

export interface FetchStoriesResponse {
  success: boolean;
  message: string;
  stories: StoryData[];
}

export interface FetchHomepageDataResponse {
  success: boolean;
  message?: string;
  postsData: FetchPostsResponse;
  storiesData: FetchStoriesResponse;
}
