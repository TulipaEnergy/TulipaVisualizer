import React, { useEffect } from "react";
import { Group, ScrollArea } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useState } from "react";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "../../styles/components/metadata/filterPerTree.css";
import FilterPerTree from "./FilterPerTree";
import { getAllMetadata } from "../../services/metadata";

interface FilteringProps {
  graphId: string;
}

const FilteringScrollMenu: React.FC<FilteringProps> = ({ graphId }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setData(await getAllMetadata());
    })();
  }, []);

  return (
    <Group gap="xs" align="center" wrap="nowrap">
      <IconFilter size={14} color="var(--mantine-color-gray-6)" />
      <ScrollArea.Autosize
        type="auto"
        scrollbarSize={6}
        style={{ width: "100%" }}
        scrollHideDelay={0}
        w="100%"
      >
        <Group
          gap="8px"
          align="center"
          wrap="nowrap"
          style={{ minWidth: "max-content" }}
        >
          {data &&
            Object.keys(data).map((cat) => (
              <FilterPerTree
                key={cat}
                graphId={graphId}
                categoryName={cat}
                categoryRoot={data[cat]}
              />
            ))}
        </Group>
      </ScrollArea.Autosize>
    </Group>
  );
};

export default FilteringScrollMenu;
