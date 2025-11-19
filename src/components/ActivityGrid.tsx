import dayjs from 'dayjs';
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type ProjectUsageRecord } from "@/lib/query";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityGridProps {
	data: ProjectUsageRecord[];
	onFilteredDataChange?: (data: ProjectUsageRecord[]) => void;
}

interface DayData {
	date: Date;
	dateKey: string;
	totalTokens: number;
	count: number;
	records: ProjectUsageRecord[];
}

interface ActivityLevel {
	level: number;
	color: string;
	darkColor: string;
}

export function ActivityGrid({ data }: ActivityGridProps) {
	const { t } = useTranslation();

	// Activity utilities included in the component
	const getActivityData = useMemo(() => {
		const today = dayjs();
		const startDate = today.startOf('year');

		// Create a map of all dates in the time range
		const dateMap = new Map<string, DayData>();

		// Initialize all dates with zero values
		let currentDate = startDate;
		while (currentDate.isBefore(today) || currentDate.isSame(today, 'day')) {
			const dateKey = currentDate.format('YYYY-MM-DD');
			const date = currentDate.toDate();

			dateMap.set(dateKey, {
				date,
				dateKey,
				totalTokens: 0,
				count: 0,
				records: []
			});

			currentDate = currentDate.add(1, 'day');
		}

		// Process usage data
		data.forEach(record => {
			try {
				const recordDate = dayjs(record.timestamp);
				const dateKey = recordDate.format('YYYY-MM-DD');

				if (dateMap.has(dateKey)) {
					const existing = dateMap.get(dateKey)!;
					const tokens = (record.usage?.input_tokens || 0) +
											 (record.usage?.output_tokens || 0) +
											 (record.usage?.cache_read_input_tokens || 0);

					existing.totalTokens += tokens;
					existing.count += 1;
					existing.records.push(record);
				}
			} catch (error) {
				console.warn('Invalid date in record:', record.timestamp);
			}
		});

		return Array.from(dateMap.values());
	}, [data]);

	const getIntensityLevel = (totalTokens: number): ActivityLevel => {
		// Calculate intensity levels based on token usage percentiles
		const allValues = getActivityData.map(d => d.totalTokens).filter(v => v > 0);

		if (totalTokens === 0 || allValues.length === 0) {
			return { level: 0, color: '#ebedf0', darkColor: '#161b22' };
		}

		// Simple intensity calculation using quartiles
		const sorted = [...allValues].sort((a, b) => a - b);
		const len = sorted.length;

		if (totalTokens >= sorted[Math.floor(len * 0.9)]) {
			return { level: 4, color: '#216e39', darkColor: '#0e4429' };
		} else if (totalTokens >= sorted[Math.floor(len * 0.7)]) {
			return { level: 3, color: '#30a14e', darkColor: '#006d32' };
		} else if (totalTokens >= sorted[Math.floor(len * 0.5)]) {
			return { level: 2, color: '#40c463', darkColor: '#26a641' };
		} else if (totalTokens >= sorted[Math.floor(len * 0.3)]) {
			return { level: 1, color: '#9be9a8', darkColor: '#39d353' };
		} else {
			return { level: 0, color: '#ebedf0', darkColor: '#161b22' };
		}
	};

	const createGrid = () => {
		const today = dayjs();
		const startDate = today.startOf('year');

		const weeks: DayData[][] = [];

		// Start from January 1st and create weeks
		let currentDate = startDate;

		// Generate weeks until we pass today
		while (currentDate.isBefore(today) || currentDate.isSame(today, 'day')) {
			const currentWeek: DayData[] = [];

			// Create a week (7 days), but only include days that are within our date range
			for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
				const dateKey = currentDate.format('YYYY-MM-DD');
				const dayData = getActivityData.find(d => d.dateKey === dateKey);

				currentWeek.push(dayData || {
					date: currentDate.toDate(),
					totalTokens: 0,
					count: 0,
					records: [],
					dateKey
				});

				currentDate = currentDate.add(1, 'day');

				// Stop if we've passed today
				if (currentDate.isAfter(today)) {
					break;
				}
			}

			// Only add the week if it contains at least one day from our target period
			if (currentWeek.some(day => {
				const dayJs = dayjs(day.date);
				return dayJs.isAfter(startDate.subtract(1, 'day')) && dayJs.isBefore(today.add(1, 'day'));
			})) {
				weeks.push(currentWeek);
			}
		}

		return weeks;
	};

	const grid = createGrid();

	const monthLabels = useMemo(() => {
		if (grid.length === 0) return [];

		const result: Array<{ month: string; weekIndex: number }> = [];

		grid.forEach((week, weekIndex) => {
			// Safety check for week data
			if (!week || week.length === 0 || !week[0]) {
				return;
			}

			const firstDay = dayjs(week[0].date);

			// Safety check for date
			if (!firstDay || !firstDay.isValid()) {
				console.warn(`Invalid date at week ${weekIndex}:`, week[0].date);
				return;
			}

			// Use dayjs to format month name directly
			const monthName = firstDay.format('MMM');

			// Only show label if this is the first week of the month or first week overall
			const isFirstWeek = weekIndex === 0;
			const previousWeekMonth = weekIndex > 0 && grid[weekIndex - 1]?.[0]?.date && dayjs(grid[weekIndex - 1][0].date).format('MMM');
			const isFirstWeekOfMonth = !isFirstWeek && previousWeekMonth !== monthName;

			if (isFirstWeek || isFirstWeekOfMonth) {
				result.push({ month: monthName, weekIndex });
			}
		});

		return result;
	}, [grid]);

	return (
		<div className="space-y-4">

			<div className="overflow-x-auto p-3">
				<div className="inline-block min-w-full">
					<div className="flex gap-3">
						{/* Grid */}
						<div className="flex-1">
							{/* Month labels */}
							<div className="flex mb-2 gap-1">
								{grid.map((_, weekIndex) => {
									const monthLabel = monthLabels.find(m => m.weekIndex === weekIndex);
									const displayText = monthLabel?.month || '';

									return (
										<div
											key={`week-label-week-${weekIndex}`}
											className="w-3 flex justify-center"
											title={`Week ${weekIndex}: ${displayText || 'No label'}`}
										>
											{displayText && (
												<div className="text-xs text-muted-foreground whitespace-nowrap">
													{displayText}
												</div>
											)}
										</div>
									);
								})}
							</div>

							{/* Activity grid */}
							<div className="flex gap-1">
								{grid.map((week, weekIndex) => (
									<div key={`activity-week-${weekIndex}`} className="flex flex-col gap-1">
										{week.map((dayData, dayIndex) => {
											const intensity = getIntensityLevel(dayData.totalTokens);

											return (
												<TooltipProvider key={`activity-day-${weekIndex}-${dayIndex}`}>
													<Tooltip>
														<TooltipTrigger asChild>
															<div
																className="w-3 h-3 rounded-sm cursor-pointer border"
																style={{
																	backgroundColor: intensity.color,
																	borderColor: 'rgba(27, 31, 36, 0.06)'
																}}
																data-date={dayjs(dayData.date).format('YYYY-MM-DD')}
																data-level={intensity.level}
															/>
														</TooltipTrigger>
														<TooltipContent>
															<div className="text-sm space-y-1">
																<div className="font-medium">
																	{dayjs(dayData.date).format('MMM D, YYYY')}
																</div>
																{dayData.totalTokens > 0 ? (
																	<>
																		<div>
																			{formatLargeNumber(dayData.totalTokens)} {t("usage.tokens", "tokens")}
																		</div>
																		<div>
																			{dayData.count} {t("usage.requests", "requests")}
																		</div>
																	</>
																) : (
																	<div className="text-muted-foreground">
																		{t("usage.noActivity", "No activity")}
																	</div>
																)}
															</div>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Legend - Fixed position, not scrollable */}
			<div className="flex items-center px-3 gap-2 mt-3 text-xs text-muted-foreground">
				<span>{t("usage.activityGrid.less", "Less")}</span>
				<div className="flex gap-1">
					{[0, 1, 2, 3, 4].map((level) => (
						<div
							key={level}
							className="w-3 h-3 rounded-sm border"
							style={{
								backgroundColor: level === 0 ? '#ebedf0' :
									level === 1 ? '#9be9a8' :
									level === 2 ? '#40c463' :
									level === 3 ? '#30a14e' : '#216e39',
								borderColor: 'rgba(27, 31, 36, 0.06)'
							}}
						/>
					))}
				</div>
				<span>{t("usage.activityGrid.more", "More")}</span>
			</div>
		</div>
	);
}

// Helper function for formatting large numbers
function formatLargeNumber(num: number): string {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	} else if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
}