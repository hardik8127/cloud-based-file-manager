import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


export const uploadToCloudinary = async (fileBuffer, fileName, userId, folder = "files") => {
  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `cloud-app/users/${userId}/${folder}`,
          public_id: `${Date.now()}_${fileName}`, 
          resource_type: "auto",
          use_filename: true,
          unique_filename: false,
          overwrite: false, 
          transformation: [
            { quality: "auto:good" },
            { fetch_format: "auto" }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });


    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width || null,
      height: result.height || null,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};


export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
      return { success: true, message: "File deleted successfully" };
    } else {
      throw new Error("Failed to delete file from Cloudinary");
    }
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
};


export const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    quality: "auto:good",
    fetch_format: "auto",
    secure: true,
    ...options
  });
};


export const generateThumbnail = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: "fill",
    quality: "auto:good",
    fetch_format: "auto",
    secure: true
  });
};


export const getFileDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      success: true,
      data: {
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width || null,
        height: result.height || null,
        created_at: result.created_at,
        secure_url: result.secure_url,
      }
    };
  } catch (error) {
    console.error("Failed to get file details:", error);
    throw new Error(`Failed to get file details: ${error.message}`);
  }
};

export default cloudinary;
