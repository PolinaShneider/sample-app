"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listFiles,
  createUpload,
  uploadToS3,
  confirmUpload,
  getDownloadUrl,
  deleteFile,
} from "@/data/files";

const FILES_QUERY_KEY = ["files"] as const;

export function useFiles() {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading, error, refetch } = useQuery({
    queryKey: FILES_QUERY_KEY,
    queryFn: listFiles,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { file_id, upload_url } = await createUpload(file.name, file.size);
      await uploadToS3(upload_url, file);
      await confirmUpload(file_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY }),
  });

  const download = async (id: string) => {
    const url = await getDownloadUrl(id);
    window.open(url, "_blank");
  };

  return {
    files,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    upload: uploadMutation.mutateAsync,
    uploadPending: uploadMutation.isPending,
    remove: removeMutation.mutateAsync,
    removePending: removeMutation.isPending,
    download,
  };
}
