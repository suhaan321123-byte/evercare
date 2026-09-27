import userAxios from "@/lib/axios/axios";

export const urlToBase64Api = async (url) => {
  const response = await userAxios.post("/upload/aws/s3/url_to_base64", {
    url: url,
  });
  return response.data;
};

export const deleteImageApi = async (fileUrl) => {
  try {
    const response = await userAxios.post(`/upload/aws/s3/delete`, {
      url: fileUrl,
    });
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const uploadImageApi = async (file, folder = "image", fileName = "") => {
  try {
    const actualFileName = fileName || file?.name || `file-${Date.now()}`;
    const presignedUrlResponse = await userAxios.post(
      `/upload/aws/s3/presigned_url`,
      {
        fileName: actualFileName,
        contentType: file.type || "application/octet-stream",
      }
    );

    if (presignedUrlResponse?.data?.message !== "success") {
      throw new Error("Failed to get signed URL");
    }

    const { signedUrl, publicUrl } = presignedUrlResponse.data;

    // Upload file directly to S3 using the signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        // Optional: Add other headers if needed
        // "Content-Length": file.size.toString(),
        // "x-amz-acl": "public-read", // If you want public access
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `S3 upload failed: ${uploadResponse.status} - ${errorText}`
      );
    }

    return publicUrl;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const uploadProviderCustomS3Api = async (
  file,
  folder = "image",
  fileName = ""
) => {
  try {
    const data = {
      file: file,
      folder: folder,
      fileName: fileName,
    };
    const response = await userAxios.post(`/upload/provider/providerS3`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true, // If your server requires credentials like cookies
    });

    return response.data.url;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Delete a file from provider S3 via API
 * @param {string} key - The S3 file key (e.g., 'uploads/image/12345.png')
 * @returns {boolean} - true if deleted successfully, false otherwise
 */
export const deleteProviderCustomS3Api = async (key) => {
  try {
    if (!key) throw new Error("File key is required");

    const response = await userAxios.delete(`/upload/provider/providerS3`, {
      data: { key }, // DELETE with body requires `data` in axios
      withCredentials: true, // if your server uses cookies/session
    });

    return response?.data?.message === "File deleted successfully";
  } catch (err) {
    console.error("Delete provider S3 error:", err);
    return false;
  }
};

export const uploadVideoApi = async (file, folder = "videos") => {
  return await uploadImageApi(file, folder);
};

export const uploadAudioApi = async (file, folder = "audio_files") => {
  return await uploadImageApi(file, folder);
};

export const uploadDocumentApi = async (
  file,
  folder = "documents",
  fileName
) => {
  return await uploadImageApi(file, folder, fileName);
};

// whatsapp file upload
export const uploadFileToCloudinary = async (
  file,
  folder = "user_uploads",
  fileName
) => {
  const mimeType = file.type.split("/")[0];
  let resourceType = "raw"; // Default for general documents (PDF, Word, etc.)

  if (mimeType === "image") {
    resourceType = "image";
  } else if (mimeType === "video") {
    resourceType = "video";
  } else if (mimeType === "audio") {
    resourceType = "raw"; // Audio files also fall under "raw"
  } else if (
    [
      "application/pdf", // PDF
      "application/msword", // Word (.doc)
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word (.docx)
      "application/vnd.ms-excel", // Excel (.xls)
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel (.xlsx)
      "application/vnd.ms-powerpoint", // PowerPoint (.ppt)
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint (.pptx)
      "text/plain", // Plain text (.txt)
      "application/zip", // ZIP files
      "application/x-rar-compressed", // RAR files
    ].includes(file.type)
  ) {
    resourceType = "raw";
  } else {
    resourceType = "raw";
  }

  try {
    const response = await uploadImageApi(file, folder, fileName);

    return {
      url: response ?? "",
      resourceType: resourceType, // e.g., image, video, raw
      mimeType: file.type, // e.g., video/mp4
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};
