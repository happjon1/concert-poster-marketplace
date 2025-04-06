import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Configure S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  region: process.env.DO_SPACE_REGION || "nyc3", // DO Spaces region
  endpoint: `https://${
    process.env.DO_SPACE_REGION || "nyc3"
  }.digitaloceanspaces.com`, // Correct endpoint format
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
  forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
});

export const uploadRouter = router({
  getSignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("Generating signed URL for DO Spaces...");

        // Generate a unique file name to prevent collisions
        const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const randomId = crypto.randomUUID();
        const key = `posters/${randomId}-${sanitizedName}`;

        const spaceName = process.env.DO_SPACES_BUCKET || "your-space-name";

        // Create the command to put an object
        const putObjectCommand = new PutObjectCommand({
          Bucket: spaceName,
          Key: key,
          ContentType: input.fileType,
          ACL: "public-read", // Make uploaded files publicly accessible
          // Add cache control headers for better performance
          CacheControl: "max-age=31536000", // Cache for 1 year
        });

        // Generate a presigned URL
        const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
          expiresIn: 3600, // URL expires in 1 hour
        });

        // Construct the public URL for Digital Ocean Spaces
        const publicUrl = `https://${spaceName}.${
          process.env.DO_SPACE_REGION || "nyc3"
        }.digitaloceanspaces.com/${key}`;

        console.log("Generated DO Spaces upload URL successfully");

        return {
          uploadUrl,
          publicUrl,
        };
      } catch (error) {
        console.error("Error generating signed URL:", error);
        throw error;
      }
    }),
});
