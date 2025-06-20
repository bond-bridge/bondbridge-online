import { VideoFileWithThumbnail } from "../components/MediaCropModal";
import { formDataApiClient } from "./apiClient";

/**
 * Uploads a media file to the server
 * @param media - The media file to upload
 * @param type - The type of media to upload
 * @param entityType - The type of entity to upload the media to
 * @returns Promise with the upload media response
 */
export const uploadMedia = async (
    media: File|VideoFileWithThumbnail,
    type : string,
    entityType : string
  ): Promise<{type:string,url:string}> => {
    if (!media) {
      throw new Error("Media is required");
    }

    const formData = new FormData();
    formData.append(type, media);
  
    const response = await formDataApiClient.post("/fileUpload?entityType="+entityType, formData);
  
    if (response.status === 200) {
      return response.data.data[0];
    } else {
      throw new Error(response.data.message || "Failed to upload media");
    }
  };