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

      const selectedPath = await uploadDatabaseFile();

      if (selectedPath) {
        // Add the database to the database store
        addDatabase(selectedPath);
        setError(null);
      } else {
        // the selectedPath is null if the user cancels the dialog
        console.info("File dialog canceled");
      }
    } catch (error: any) {
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
