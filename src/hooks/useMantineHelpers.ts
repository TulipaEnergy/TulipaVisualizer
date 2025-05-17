import { useState, useEffect } from "react";
import { useDisclosure, useViewportSize } from "@mantine/hooks";

/**
 * Custom hook that provides enhanced Mantine hooks functionality for our application
 */
export const useMantineHelpers = () => {
  // Viewport size for responsive layouts
  const { width: viewportWidth } = useViewportSize();
  const [isMobile, setIsMobile] = useState(false);

  // Modal controls
  const [opened, { open, close }] = useDisclosure(false);

  // Set mobile view based on viewport width
  useEffect(() => {
    setIsMobile(viewportWidth < 768);
  }, [viewportWidth]);

  return {
    isMobile,
    viewportWidth,
    modalControls: {
      opened,
      open,
      close,
    },
  };
};

export default useMantineHelpers;
