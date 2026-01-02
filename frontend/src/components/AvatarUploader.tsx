"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserOrbAvatar } from "@/components/ui/user-orb-avatar"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AvatarUploaderProps {
  currentAvatar?: string
  userName: string
  userId: string
  onUpload: (url: string) => void
}

export function AvatarUploader({ currentAvatar, userName, userId, onUpload }: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // No external upload needed - we'll use base64 like organization images

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, or WebP)")
      return
    }

    // Validate file size (2MB max for base64 storage)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create a preview URL with compression
      const reader = new FileReader()
      reader.onloadend = async () => {
        const img = new Image()
        img.onload = () => {
          // Create canvas to resize and compress image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Set max dimensions - reduced for smaller file size
          const maxWidth = 150
          const maxHeight = 150
          let width = img.width
          let height = img.height
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }
          
          // Resize image
          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 (same as organization images)
          const base64String = canvas.toDataURL('image/jpeg', 0.8)
          setPreviewUrl(base64String)
          onUpload(base64String)
          toast.success("Profile picture updated successfully")
          setIsUploading(false)
        }
        
        img.onerror = () => {
          toast.error("Failed to process image")
          setIsUploading(false)
        }
        
        img.src = reader.result as string
      }
      
      reader.onerror = () => {
        toast.error("Failed to read file")
        setIsUploading(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast.error(error.message || "Failed to upload profile picture")
      setIsUploading(false)
    } finally {
      setUploadProgress(0)
    }
  }

  const removeAvatar = () => {
    // No need to delete from storage since we're using base64 in database
    setPreviewUrl(null)
    onUpload("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    toast.success("Profile picture removed")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative">
          {previewUrl ? (
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 group-hover:opacity-75 transition-opacity"
              />
              {!isUploading && (
                <button
                  onClick={removeAvatar}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  type="button"
                  aria-label="Remove profile picture"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <UserOrbAvatar
              seed={userId || userName}
              size={96}
              initials={getInitials(userName)}
            />
          )}
        </div>

        {/* Upload Button */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="avatar-upload"
            disabled={isUploading}
          />
          <label htmlFor="avatar-upload">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, GIF or WebP. Max 2MB. Images resized to 150x150px.
          </p>
        </div>
      </div>

      {/* Storage info */}
      <Alert>
        <AlertDescription className="text-xs">
          Images are compressed to 150x150px and stored directly in the database (same as organization logos).
        </AlertDescription>
      </Alert>
    </div>
  )
} 