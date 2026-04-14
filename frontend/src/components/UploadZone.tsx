import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitJob } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UploadingFile {
  name: string
  status: 'uploading' | 'done' | 'error'
}

export function UploadZone() {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState<UploadingFile[]>([])

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file)
      return submitJob({
        filename: file.name,
        contentType: file.type,
        imageBase64: base64,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (_err, file) => {
      toast.error(`Failed to upload ${(file as File).name}`)
    },
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: UploadingFile[] = acceptedFiles.map((f) => ({
        name: f.name,
        status: 'uploading' as const,
      }))
      setUploading((prev) => [...prev, ...newFiles])

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]
        try {
          await uploadMutation.mutateAsync(file)
          setUploading((prev) =>
            prev.map((u) => (u.name === file.name && u.status === 'uploading' ? { ...u, status: 'done' } : u))
          )
        } catch {
          setUploading((prev) =>
            prev.map((u) => (u.name === file.name && u.status === 'uploading' ? { ...u, status: 'error' } : u))
          )
        }
      }

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.status === 'uploading'))
      }, 2000)
    },
    [uploadMutation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  })

  const uploadingCount = uploading.filter((u) => u.status === 'uploading').length

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150',
          isDragActive
            ? 'border-[#635BFF] bg-[#635BFF08]'
            : 'border-[#D1D5DB] bg-white hover:border-[#B0B7C3]'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={cn(
            'mb-3 h-8 w-8',
            isDragActive ? 'text-[#635BFF]' : 'text-[#8792A2]'
          )}
        />
        <p className="text-sm font-medium text-[#425466]">
          {isDragActive ? 'Release to upload' : 'Drop images to process'}
        </p>
        <p className="mt-1 text-xs text-[#8792A2]">
          PNG, JPG, WEBP — up to 10MB each — batch supported
        </p>
        {uploadingCount > 0 && (
          <p className="mt-2 text-xs font-medium text-[#635BFF]">
            Uploading {uploadingCount}...
          </p>
        )}
      </div>

      {uploading.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploading.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                file.status === 'uploading' && 'border-[#DEEBFF] bg-[#DEEBFF] text-[#0055CC]',
                file.status === 'done' && 'border-[#E3FCEF] bg-[#E3FCEF] text-[#00875A]',
                file.status === 'error' && 'border-[#FFEBE6] bg-[#FFEBE6] text-[#DE350B]'
              )}
            >
              {file.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin" />}
              {file.status === 'error' && <X className="h-3 w-3" />}
              {file.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
