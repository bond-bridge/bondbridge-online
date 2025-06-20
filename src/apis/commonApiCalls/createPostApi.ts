import apiClient, { adminApiClient, formDataApiClient } from "../apiClient";
import { CreatePostRequest } from "../apiTypes/request";
import {
  CreatePostResponse,
  RewriteWithBondChatResponse,
} from "../apiTypes/response";
import { VideoFileWithThumbnail } from "../../components/MediaCropModal";
import { uploadMedia } from "../uploadApi";

/**
 * Creates a new post with optional media attachments
 * @param postData - The post data including content and media files
 * @returns Promise with the created post data
 */
export const createPost = async (
  postData: CreatePostRequest
): Promise<CreatePostResponse> => {
  const formData = new FormData();
  formData.append("content", postData.content);
  formData.append("whoCanComment", postData.whoCanComment.toString());
  formData.append("privacy", postData.privacy.toString());

  // Handle media files while maintaining sequence
  if (postData.image && postData.image.length > 0) {
    for (let index = 0; index < postData.image.length; index++) {
      const file = postData.image[index];
      if (file.type.startsWith("image/")) {
        formData.append(`image`, file);
      } else if (file.type.startsWith("video/")) {
        formData.append(`video`, file);
        
        // Check if this is a video with thumbnail
        if ('thumbnail' in file && file.thumbnail instanceof File) {
          const videoFile = file as VideoFileWithThumbnail;
          
          // Add the thumbnail for the video
          formData.append(`thumbnail`, videoFile.thumbnail);
          
          // Add crop data as JSON string
          formData.append(`videoCropData_${index}`, JSON.stringify(videoFile.cropData));
        }
      }
    }
  }

  // For debugging
  console.log("Sending post data:", Object.fromEntries(formData.entries()));

  const response = await formDataApiClient.post<CreatePostResponse>(
      "/post",
      formData
    );
  return response.data;
};



/**
 * Creates a new post with optional media attachments
 * @param postData - The post data including content and media files
 * @returns Promise with the created post data
 */
export const createCommunityPost = async (
  postData: CreatePostRequest
): Promise<CreatePostResponse> => {

  const communityMediaLinks : {type:string,url:string}[] = [];
  // Handle media files while maintaining sequence
  if (postData.image && postData.image.length > 0) {
    for (let index = 0; index < postData.image.length; index++) {
      const file = postData.image[index];
      if (file.type.startsWith("image/")) {
        if (postData.isCommunityPost) {
          const mediaLink = await uploadMedia(file, "image", "community");
          communityMediaLinks.push(mediaLink);
        }
      } else if (file.type.startsWith("video/")) {
        if (postData.isCommunityPost) {
          const mediaLink = await uploadMedia(file, "video", "community");
          communityMediaLinks.push(mediaLink);
        }
      }
    }
  }

  const response = await adminApiClient.post<CreatePostResponse>(
      `/communities/${postData.communityId}/post`,
      {
        content: postData.content,
        communityId: postData.communityId,
        isAnonymous: postData.isAnonymous,
        mediaUrls: communityMediaLinks,
      }
    );

  return response.data;
};
/**
 * Updates an existing post with new content
 * @param postData - The post data including content and postId
 * @returns Promise with the updated post response
 */
export const updatePost = async (postData: {
  content: string;
  postId: string;
}): Promise<{ success: boolean; message: string }> => {
  if (!postData.postId) {
    throw new Error("Post ID is required");
  }

  const response = await apiClient.put("/edit-post", {
    post_id: postData.postId,
    content: postData.content,
  });

  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message || "Failed to update post");
  }
};

/**
 * Deletes a post with the given feedId
 * @param feedId - The ID of the post to delete
 * @returns Promise with the delete post response
 */
export const deletePost = async (
  post_id: string
): Promise<{ success: boolean; message: string }> => {
  if (!post_id) {
    throw new Error("Feed ID is required");
  }

  const response = await apiClient.delete("/delete-post", {
    data: { post_id },
  });

  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message || "Failed to delete post");
  }
};

/**
 * Rewrites post content using BondChat AI
 * @param content - The content to rewrite
 * @returns Promise with the rewritten content
 */
export const rewriteWithBondChat = async (
  content: string
): Promise<RewriteWithBondChatResponse> => {
  const response = await apiClient.post<RewriteWithBondChatResponse>(
    "/rewriteWithBond",
    { caption: content }
  );

  // Some formatting to clean up the response
  const data = response.data;
  if (data.rewritten) {
    data.rewritten = data.rewritten.replace(/^[^\w\s]+|[^\w\s]+$/g, "").trim();
  }

  return data;
};
