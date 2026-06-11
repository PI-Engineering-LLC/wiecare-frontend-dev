import { useState } from 'react';
import { api } from '@/api/apiClient'; // Assuming apiClient returns promises

export function useUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const uploadFileToS3 = async ( {client_id, file, type = 'document', isPrivate = true}) => {
        setIsUploading(true);
        setError(null);
        try {
            // Perform direct API calls, not useQuery inside this function
            const presignedUrlResponse = await api.getPresignedUploadUrl({
                filename: file.name,
                contentType: file.type,
                type,
                isPrivate
            });
            // Assuming api.getPresignedUploadUrl returns { data: { file_url, file_key } }
            
            const { file_url, file_key } = presignedUrlResponse;

            // Direct API call to upload the file
            await api.uploadFileToS3({ file_url: file_url, file: file, client_id });

            return file_key; // Return the key for the uploaded file
        } catch (err) {
            setError(err.message);
            // Re-throw the error so the calling component can also catch it
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    // If you need React Query's mutation management (e.g., automatic retries, success/error callbacks)
    // You would use useMutation instead of a direct async function, but it would be returned from the hook:
    /*
    const uploadMutation = useMutation({
        mutationFn: async ({ file, type = 'document', isPrivate = true }) => {
            const presignedUrlResponse = await api.getPresignedUploadUrl({
                filename: file.name,
                contentType: file.type,
                type,
                isPrivate
            });
            const { file_url, file_key } = presignedUrlResponse.data;
            await api.uploadFileToS3({ file_url: file_url, file: file });
            return file_key;
        },
        onMutate: () => {
            setIsUploading(true);
            setError(null);
        },
        onSuccess: () => {
            // Handle success, e.g., invalidate queries
        },
        onError: (err) => {
            setError(err.message);
        },
        onSettled: () => {
            setIsUploading(false);
        }
    });
    */

    // Returning the imperative function
    return { uploadFileToS3, isUploading, error };

    // Or if using useMutation:
    // return { upload: uploadMutation.mutateAsync, isUploading: uploadMutation.isPending, error: uploadMutation.error };
}
// import { useState } from 'react';
// import { api } from '@/api/apiClient';
// import { useQuery} from '@tanstack/react-query';


// export function useUpload() {
//     const [isUploading, setIsUploading] = useState(false);
//     const [error, setError] = useState(null);

//     const uploadFileToS3 = async (file, type='document', isPrivate=true) => {
//         setIsUploading(true);
//         setError(null);
//         try {
//             const { data: result, isLoading } = useQuery({
//                 queryKey: ['presigned-url'],
//                 queryFn: () => api.getPresignedUploadUrl({ filename: file.name, contentType: file.type , type, isPrivate}),
//             });
//             // const result = await api.getPresignedUploadUrl({ filename: file.name, contentType: file.type });
//             const { file_url, file_key } = result;

//             const { data: s3Response } = useQuery({
//                 queryKey: ['presigned-url'],
//                 queryFn: () => api.uploadFileToS3({ file_url: file_url, file: file }),
//             });
//             // const s3Response =  await api.uploadFileToS3({ file_url: file_url, file: file }); 
//             return file_key;
//         } catch (err) {
//             setError(err.message);
//             throw err;
//         } finally {
//             setIsUploading(false);
//         }


//     }
//     return { uploadFileToS3, isUploading, error };
// }