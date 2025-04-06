import { Injectable } from '@angular/core';
import { TrpcService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(private trpcService: TrpcService) {}

  async uploadImage(file: File): Promise<string> {
    try {
      // Get a signed URL from the backend
      const { uploadUrl, publicUrl } = await this.trpcService.getSignedUrl({
        fileName: file.name,
        fileType: file.type,
      });

      // Upload the file directly to DigitalOcean Spaces
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // Return the public CDN URL for the uploaded file
      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
}
