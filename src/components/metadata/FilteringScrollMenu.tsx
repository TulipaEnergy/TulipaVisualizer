import React, { useEffect } from "react";
import { Group, ScrollArea } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useState } from "react";
import FilterPerTree from "./FilterPerTree";
import { getAllMetadata, hasMetadata } from "../../services/metadata";
import { MetaTreeRootsByCategoryName } from "../../types/metadata";
import useVisualizationStore from "../../store/visualizationStore";

interface FilteringProps {
  graphId: string;
}

const FilteringScrollMenu: React.FC<FilteringProps> = ({ graphId }) => {
  const [data, setData] = useState<MetaTreeRootsByCategoryName>({});
  const { getGraphDatabase } = useVisualizationStore();

  const dbPath = getGraphDatabase(graphId)!;
  useEffect(() => {
    (async () => {
      if (await hasMetadata(dbPath)) {
        setData(await getAllMetadata(dbPath));
      } else {
        setData({});
      }
    })();
  }, [dbPath]);

  return (
    <Group gap="xs" align="center" wrap="nowrap">
      <IconFilter size={"1rem"} color="var(--mantine-color-gray-6)" />
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
