import {
  Card,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Globe, Upload, Plus, Trash2 } from "lucide-react";
import { DriveFile, getFileIcon, formatFileSize } from "../lib/googleDrive";

interface GoogleDriveSectionProps {
  accessToken: string | null;
  driveFiles: DriveFile[];
  loadingFiles: boolean;
  uploadProgress: number;
  isUploading: boolean;
  onRefreshFiles: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateFolder: () => void;
  onDownloadFile: (fileId: string, fileName: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export function GoogleDriveSection({
  accessToken,
  driveFiles,
  loadingFiles,
  uploadProgress,
  isUploading,
  onRefreshFiles,
  onFileUpload,
  onCreateFolder,
  onDownloadFile,
  onDeleteFile,
}: GoogleDriveSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Google Drive Files</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            multiple
            onChange={onFileUpload}
            className="hidden"
            id="file-upload"
            disabled={!accessToken || isUploading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            disabled={!accessToken || isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={!accessToken || isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading
              ? `Uploading... ${Math.round(uploadProgress)}%`
              : "Upload Files"}
          </Button>
          <Button
            onClick={onRefreshFiles}
            disabled={!accessToken || loadingFiles}
            variant="outline"
            size="sm"
          >
            {loadingFiles ? "Loading..." : "Refresh Files"}
          </Button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading files...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {driveFiles.length > 0 ? (
        <div className="grid gap-3">
          {driveFiles.map((file) => (
            <Card
              key={file.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} •{" "}
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {file.webViewLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(file.webViewLink, "_blank")
                      }
                    >
                      View
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadFile(file.id, file.name)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Click "Refresh Files" to load your Google Drive files
            </p>
            <Button
              onClick={onRefreshFiles}
              disabled={!accessToken || loadingFiles}
              variant="outline"
            >
              {loadingFiles ? "Loading..." : "Load Drive Files"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
