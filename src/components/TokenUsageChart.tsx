import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AreaChart } from "@/components/ui/area-chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProjectUsageRecord } from "@/lib/query";
import { formatLargeNumber } from "@/lib/utils";

interface TokenUsageChartProps {
	data: ProjectUsageRecord[];
	onFilteredDataChange?: (filteredData: ProjectUsageRecord[]) => void;
}

type TimeRange = "5h" | "today" | "7d" | "week" | "month" | "all";

export function TokenUsageChart({
	data,
	onFilteredDataChange,
}: TokenUsageChartProps) {
	const { t } = useTranslation();
	const [selectedModel, setSelectedModel] = useState<string>("all");
	const [timeRange, setTimeRange] = useState<TimeRange>("5h");
	const [activeCategories, setActiveCategories] = useState<string[]>([
		"Input Tokens",
		"Output Tokens",
	]);

	// Get unique models from data
	const availableModels = useMemo(() => {
		const models = new Set<string>();
		data.forEach((record) => {
			if (record.model) {
				models.add(record.model);
			}
		});
		return Array.from(models).sort();
	}, [data]);

	// Filter data based on selected model and time range
	const filteredData = useMemo(() => {
		let filtered = data;

		// Filter by model
		if (selectedModel !== "all") {
			filtered = filtered.filter((record) => record.model === selectedModel);
		}

		// Filter by time range
		const now = dayjs();
		let startTime: dayjs.Dayjs;

		switch (timeRange) {
			case "5h":
				startTime = now.subtract(5, 'hour');
				break;
			case "today":
				startTime = now.startOf('day');
				break;
			case "7d":
				startTime = now.subtract(6, 'day');
				break;
			case "week":
				startTime = now.day(0); // Sunday (start of week)
				break;
			case "month":
				startTime = now.startOf('month');
				break;
			case "all":
				// For "all time", find the earliest timestamp in the data
				if (filtered.length > 0) {
					const earliestTime = dayjs(
						Math.min(
							...filtered.map((record) => dayjs(record.timestamp).valueOf()),
						),
					);
					startTime = earliestTime;
				} else {
					startTime = dayjs(0);
				}
				break;
			default:
				startTime = now.subtract(5, 'hour');
		}

		filtered = filtered.filter(
			(record) => dayjs(record.timestamp).isAfter(startTime.subtract(1, 'millisecond')),
		);

		return filtered;
	}, [data, selectedModel, timeRange]);

	// Notify parent component when filtered data changes
	useEffect(() => {
		if (onFilteredDataChange) {
			onFilteredDataChange(filteredData);
		}
	}, [filteredData, onFilteredDataChange]);

	// Handle category toggling
	const handleCategoryToggle = (value: any) => {
		if (value && value.categoryClicked) {
			setActiveCategories((prev) => {
				if (prev.includes(value.categoryClicked)) {
					return prev.filter((cat) => cat !== value.categoryClicked);
				} else {
					return [...prev, value.categoryClicked];
				}
			});
		}
	};

	// Toggle category function for direct use
	const toggleCategory = (category: string) => {
		handleCategoryToggle({ categoryClicked: category });
	};
	// Group data based on time range
	const groupDataByInterval = (records: ProjectUsageRecord[]) => {
		const intervals: {
			[key: string]: { input: number; output: number; cache: number };
		} = {};
		const now = dayjs();

		if (timeRange === "all") {
			// For all time, group by week
			const earliestTime =
				records.length > 0
					? dayjs(
							Math.min(
								...records.map((record) =>
									dayjs(record.timestamp).valueOf(),
								),
							),
						)
					: dayjs();

			// Get start of the week for earliest time
			let currentWeekStart = earliestTime.day(0); // Sunday
			const nowWeekStart = now.day(0); // Sunday

			// Generate weekly intervals from earliest week to current week
			while (currentWeekStart.isBefore(nowWeekStart) || currentWeekStart.isSame(nowWeekStart)) {
				intervals[currentWeekStart.valueOf()] = {
					input: 0,
					output: 0,
					cache: 0,
				};
				// Move to next week (7 days)
				currentWeekStart = currentWeekStart.add(1, 'week');
			}

			// Group records into weekly intervals
			records.forEach((record) => {
				const recordTime = dayjs(record.timestamp);
				const weekStart = recordTime.day(0); // Sunday
				const weekKey = weekStart.valueOf();

				if (intervals[weekKey]) {
					intervals[weekKey].input += record.usage?.input_tokens || 0;
					intervals[weekKey].output += record.usage?.output_tokens || 0;
					intervals[weekKey].cache +=
						record.usage?.cache_read_input_tokens || 0;
				}
			});
		} else if (timeRange === "5h") {
			// Group by 30-minute intervals for 5h time range
			const intervalMs = 30 * 60 * 1000; // 30 minutes in milliseconds

			// Round current time down to nearest 30-minute boundary (epoch-based)
			const currentIntervalKey =
				Math.floor(now.valueOf() / intervalMs) * intervalMs;

			// Generate intervals (10 intervals for 5 hours)
			for (let i = 0; i < 10; i++) {
				const intervalKey = currentIntervalKey - i * intervalMs;
				intervals[intervalKey] = { input: 0, output: 0, cache: 0 };
			}

			// Group records into 30-minute intervals
			records.forEach((record) => {
				const recordTime = dayjs(record.timestamp);
				const recordIntervalKey =
					Math.floor(recordTime.valueOf() / intervalMs) * intervalMs;

				if (intervals[recordIntervalKey]) {
					intervals[recordIntervalKey].input += record.usage?.input_tokens || 0;
					intervals[recordIntervalKey].output +=
						record.usage?.output_tokens || 0;
					intervals[recordIntervalKey].cache +=
						record.usage?.cache_read_input_tokens || 0;
				}
			});
		} else if (timeRange === "today") {
			// Group by hour for today
			const startOfToday = now.startOf('day');
			const currentHour = now.hour();

			for (let i = 0; i <= currentHour; i++) {
				const hourTime = startOfToday.add(i, 'hour');
				intervals[hourTime.valueOf()] = { input: 0, output: 0, cache: 0 };
			}

			records.forEach((record) => {
				const recordTime = dayjs(record.timestamp);
				const hourStart = recordTime.startOf('hour');
				const hourKey = hourStart.valueOf();

				if (intervals[hourKey]) {
					intervals[hourKey].input += record.usage?.input_tokens || 0;
					intervals[hourKey].output += record.usage?.output_tokens || 0;
					intervals[hourKey].cache +=
						record.usage?.cache_read_input_tokens || 0;
				}
			});
		} else {
			// Group by day for longer periods (7d, week, month)
			let startDate: dayjs.Dayjs;
			let days: number;

			if (timeRange === "week") {
				startDate = now.day(0); // Sunday
				// Calculate actual days in the current week so far (from start of week to today)
				const todayStart = now.startOf('day');
				days = todayStart.diff(startDate, 'day') + 1;
			} else if (timeRange === "month") {
				startDate = now.startOf('month');
				// Calculate actual days in the current month so far (from start of month to today)
				const todayStart = now.startOf('day');
				days = todayStart.diff(startDate, 'day') + 1;
			} else {
				// For 7d, start from (days-1) days ago to include today
				days = 7;
				startDate = now.subtract(days - 1, 'day').startOf('day');
			}

			for (let i = 0; i < days; i++) {
				const dayTime = startDate.add(i, 'day');
				intervals[dayTime.valueOf()] = { input: 0, output: 0, cache: 0 };
			}

			records.forEach((record) => {
				const recordTime = dayjs(record.timestamp);
				const dayStart = recordTime.startOf('day');
				const dayKey = dayStart.valueOf();

				if (intervals[dayKey]) {
					intervals[dayKey].input += record.usage?.input_tokens || 0;
					intervals[dayKey].output += record.usage?.output_tokens || 0;
					intervals[dayKey].cache += record.usage?.cache_read_input_tokens || 0;
				}
			});
		}

		return intervals;
	};

	const groupedData = groupDataByInterval(filteredData);

	// Prepare chart data for Recharts
	const chartData = Object.keys(groupedData)
		.map(Number)
		.sort((a, b) => a - b)
		.map((timestamp) => {
			const date = dayjs(timestamp);
			let label: string;
			if (timeRange === "all") {
				label = date.format("MMM DD, YYYY");
			} else if (timeRange === "today") {
				label = date.format("HH:mm");
			} else if (timeRange === "5h") {
				label = date.format("HH:mm");
			} else {
				label = date.format("MMM DD");
			}

			return {
				time: label,
				timestamp,
				"Input Tokens": groupedData[timestamp].input,
				"Output Tokens": groupedData[timestamp].output,
				"Cache Read Tokens": groupedData[timestamp].cache,
			};
		});

	if (!data || data.length === 0) {
		return (
			<div className="h-96 flex items-center justify-center border rounded-lg bg-muted/20">
				<p className="text-muted-foreground">{t("usageChart.noData")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 w-full min-w-0">
			{/* Filter Controls */}
			<div className="flex gap-4 items-center flex-wrap pb-5">
				<div className="flex items-center gap-2">
					<label htmlFor="model-filter" className="text-sm font-medium">
						{t("usageChart.modelFilter")}
					</label>
					<Select value={selectedModel} onValueChange={setSelectedModel}>
						<SelectTrigger id="model-filter" className="w-48">
							<SelectValue placeholder={t("usageChart.allModels")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("usageChart.allModels")}</SelectItem>
							{availableModels.map((model) => (
								<SelectItem key={model} value={model}>
									{model}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<label htmlFor="time-range" className="text-sm font-medium">
						{t("usageChart.timeRange")}
					</label>
					<Select
						value={timeRange}
						onValueChange={(value: TimeRange) => setTimeRange(value)}
					>
						<SelectTrigger id="time-range" className="w-48">
							<SelectValue placeholder={t("usageChart.selectTimeRange")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="5h">{t("usageChart.last5Hours")}</SelectItem>
							<SelectItem value="today">
								{t("usageChart.startOfToday")}
							</SelectItem>
							<SelectItem value="7d">{t("usageChart.last7Days")}</SelectItem>
							<SelectItem value="week">
								{t("usageChart.startOfWeek")}
							</SelectItem>
							<SelectItem value="month">
								{t("usageChart.startOfMonth")}
							</SelectItem>
							<SelectItem value="all">{t("usageChart.allTime")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Custom Legend */}
			<div className="flex gap-6 items-center justify-center pb-4">
				{[
					{ key: "Input Tokens", label: t("usage.inputTokens") },
					{ key: "Output Tokens", label: t("usage.outputTokens") },
					{ key: "Cache Read Tokens", label: t("usage.cacheReadTokens") },
				].map(({ key, label }) => {
					const isActive = activeCategories.includes(key);
					const color =
						key === "Input Tokens"
							? "bg-blue-500"
							: key === "Output Tokens"
								? "bg-emerald-500"
								: "bg-amber-500";
					return (
						<button
							key={key}
							onClick={() => toggleCategory(key)}
							className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${
								isActive
									? "opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800"
									: "opacity-40 hover:opacity-60"
							}`}
						>
							<span className={`w-3 h-3 rounded-full ${color}`} />
							<span className="text-gray-700 dark:text-gray-300">{label}</span>
						</button>
					);
				})}
			</div>

			{/* Chart */}
			<div className="h-[320px] w-full min-w-0">
				<AreaChart
					data={chartData}
					index="time"
					categories={activeCategories}
					colors={activeCategories.map((cat) => {
						if (cat === "Input Tokens") return "blue";
						if (cat === "Output Tokens") return "emerald";
						if (cat === "Cache Read Tokens") return "amber";
						return "blue";
					})}
					valueFormatter={formatLargeNumber}
					fill="gradient"
					className="h-full"
					showLegend={false}
				/>
			</div>
		</div>
	);
}
