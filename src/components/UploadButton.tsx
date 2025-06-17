import { useState } from "react";
import { Button } from "@mantine/core";
import { uploadDatabaseFile } from "../services/databaseOperations";
import useVisualizationStore from "../store/visualizationStore";

const UploadButton: React.FC = () => {
  const { setError, addDatabase } = useVisualizationStore();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileSelect() {
    try {
      setIsUploading(true);

      // Secure file selection with .duckdb extension validation
      const selectedPath = await uploadDatabaseFile();

      if (selectedPath) {
        // Add validated database to global registry
        addDatabase(selectedPath);
        setError(null);
      } else {
        // User cancellation - no error state needed
        console.info("File dialog canceled");
      }
    } catch (error: any) {
      // Comprehensive error handling with user feedback
      setError(`Error selecting file: ${error.message || error}`);
      console.error("Error selecting file:", error);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Button
      className="upload-button"
      onClick={handleFileSelect}
      disabled={isUploading}
    >
      {isUploading ? "Uploading..." : "Upload Database File"}
    </Button>
  );
};

export default UploadButton;
