import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create S3 client (works with DigitalOcean Spaces)
const s3Client = new S3Client({
  endpoint: process.env["DO_SPACES_ENDPOINT"],
  credentials: {
    accessKeyId: process.env["DO_SPACES_KEY"] || "",
    secretAccessKey: process.env["DO_SPACES_SECRET"] || "",
  },
  region: "us-east-1", // DigitalOcean uses this regardless of actual region
});

// Configure multer middleware for handling file uploads
export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env["DO_SPACES_BUCKET"] || "",
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      // Generate unique filename
      const fileName = `posters/${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Function to generate signed URLs for client-side uploads
export const getSignedUrl = async (
  fileName: string,
  fileType: string
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  const key = `posters/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;

  const command = new PutObjectCommand({
    Bucket: process.env["DO_SPACES_BUCKET"] || "",
    Key: key,
    ContentType: fileType,
  });

  // Use the AWS SDK v3 method for generating signed URLs
  const uploadUrl = await awsGetSignedUrl(s3Client, command, {
    expiresIn: 300,
  }); // 5 minutes
  const publicUrl = `${process.env["DO_SPACES_CDN_URL"]}/${key}`;

  return { uploadUrl, publicUrl };
};
