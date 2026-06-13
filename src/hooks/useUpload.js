import { useState } from 'react';
import { api } from '@/api/apiClient'; // Assuming apiClient returns promises

export function useUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const uploadFileToS3 = async ( {file, type = 'document', isPrivate = true, client_id =null}) => {
        setIsUploading(true);
        setError(null);
        try {
            const presignedUrlResponse = await api.getPresignedUploadUrl({
                filename: file.name,
                contentType: file.type,
                type,
                isPrivate
            });
            
            const { file_url, file_key } = presignedUrlResponse;

            await api.uploadFileToS3({ file_url: file_url, file: file, client_id });

            return file_key;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // Returning the imperative function
    return { uploadFileToS3, isUploading, error };
}
