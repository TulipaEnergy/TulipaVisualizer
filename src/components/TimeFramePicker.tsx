import { useEffect, useState } from "react";
import { DatePickerInput } from "@mantine/dates";
import { Group, Text, Button } from "@mantine/core";
import useVisualizationStore from "../store/visualizationStore";

interface TimeFramePickerProps {
  className?: string;
}

const TimeFramePicker: React.FC<TimeFramePickerProps> = ({ className }) => {
  const { dateRange, setDateRange } = useVisualizationStore();
  const [startDate, setStartDate] = useState<Date | null>(dateRange.startDate);
  const [endDate, setEndDate] = useState<Date | null>(dateRange.endDate);

  useEffect(() => {
    setStartDate(dateRange.startDate);
    setEndDate(dateRange.endDate);
  }, [dateRange]);

  // Handle start date changes
  const handleStartDateChange = (value: Date | null) => {
    setStartDate(value);
    // If start date is after end date, adjust end date
    if (value && endDate && value > endDate) {
      setEndDate(value);
      setDateRange({ startDate: value, endDate: value });
    } else {
      setDateRange({ startDate: value, endDate });
    }
  };

  // Handle end date changes
  const handleEndDateChange = (value: Date | null) => {
    setEndDate(value);
    // If end date is before start date, adjust start date
    if (value && startDate && value < startDate) {
      setStartDate(value);
      setDateRange({ startDate: value, endDate: value });
    } else {
      setDateRange({ startDate, endDate: value });
    }
  };

  return (
    <Group className={className} align="flex-end">
      <Text size="sm" fw={500}>
        Time Frame:
      </Text>
      <Group gap="xs">
        <DatePickerInput
          label="From"
          placeholder="Select date"
          value={startDate}
          onChange={handleStartDateChange as any} // Type assertion to fix compatibility issue
          maxDate={new Date()}
          valueFormat="YYYY-MM-DD"
          clearable={false}
          size="sm"
        />
        <DatePickerInput
          label="To"
          placeholder="Select date"
          value={endDate}
          onChange={handleEndDateChange as any}
          minDate={startDate || undefined}
          maxDate={new Date()}
          valueFormat="YYYY-MM-DD"
          clearable={false}
          size="sm"
        />
        <Button
          onClick={() => setDateRange({ startDate, endDate })}
          size="sm"
          style={{ marginTop: "auto" }}
        >
          Apply
        </Button>
      </Group>
    </Group>
  );
};

export default TimeFramePicker;
