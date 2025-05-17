import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import useVisualizationStore from "../store/visualizationStore";

const UploadButton: React.FC = () => {
  const { setDbFilePath, setIsLoading, setError } = useVisualizationStore();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileSelect() {
    try {
      setIsUploading(true);
      setIsLoading(true);

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "DuckDB Files",
            extensions: ["duckdb"],
          },
        ],
      });

      if (typeof selected === "string") {
        await invoke("set_path", { path: selected });
        setDbFilePath(selected);
        setError(null);
        console.log("Selected file:", selected);
      } else {
        console.log("No file selected.");
      }
    } catch (error: any) {
      setError(`Error selecting file: ${error.message || error}`);
      console.error("Error selecting file:", error);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  }

  return (
    <button
      className="upload-button"
      onClick={handleFileSelect}
      disabled={isUploading}
    >
      {isUploading ? "Uploading..." : "Upload Database File"}
    </button>
  );
};

export default UploadButton;
