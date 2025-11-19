import {
	ActivityIcon,
	BellIcon,
	BotIcon,
	BrainIcon,
	CpuIcon,
	FileJsonIcon,
	FolderIcon,
	LayoutGridIcon,
	SettingsIcon,
	TerminalIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn, isMacOS } from "../lib/utils";
import { UpdateButton } from "./UpdateButton";
import { WindowControls } from "./WindowControls";
import { ScrollArea } from "./ui/scroll-area";

type ModuleType = "claude" | "codex" | "proxy";

interface NavLinkItem {
	to: string;
	icon: React.ElementType;
	label: string;
	onClick?: (e: React.MouseEvent) => void;
	end?: boolean; // For exact path matching
}

export function Layout() {
	const { t } = useTranslation();
	const location = useLocation();
	const navigate = useNavigate();
	const isProjectsRoute = location.pathname.startsWith("/projects");

	// State to track the active module context
	const [activeModule, setActiveModule] = useState<ModuleType>(() => {
		return (localStorage.getItem("activeModule") as ModuleType) || "claude";
	});

	// Update active module based on URL path
	useEffect(() => {
		const path = location.pathname;
		let newModule: ModuleType | null = null;

		if (path.startsWith("/claude")) {
			newModule = "claude";
		} else if (path.startsWith("/codex")) {
			newModule = "codex";
		} else if (path.startsWith("/proxy")) {
			newModule = "proxy";
		}

		if (newModule && newModule !== activeModule) {
			setActiveModule(newModule);
			localStorage.setItem("activeModule", newModule);
		}
	}, [location.pathname, activeModule]);

	const claudeLinks: NavLinkItem[] = [
		{
			to: "/claude",
			icon: BotIcon,
			label: t("navigation.configurations"),
		},
		{
			to: "/projects",
			icon: FolderIcon,
			label: t("navigation.projects"),
		},
		{
			to: "/mcp",
			icon: CpuIcon,
			label: t("navigation.mcp"),
		},
		{
			to: "/agents",
			icon: BotIcon,
			label: "Agents",
		},
		{
			to: "/memory",
			icon: BrainIcon,
			label: t("navigation.memory"),
		},
		{
			to: "/commands",
			icon: TerminalIcon,
			label: t("navigation.commands"),
		},
		{
			to: "/notification",
			icon: BellIcon,
			label: t("navigation.notifications"),
		},
		{
			to: "/usage",
			icon: ActivityIcon,
			label: t("navigation.usage"),
		},
		{
			to: "/settings",
			icon: SettingsIcon,
			label: t("navigation.settings"),
		},
	];

	const codexLinks: NavLinkItem[] = [
		{
			to: "/codex",
			icon: FileJsonIcon,
			label: "Configuration", // 配置文件
			end: true, // Exact match only
		},
		{
			to: "/projects",
			icon: FolderIcon,
			label: t("navigation.projects"), // 项目
		},
		{
			to: "/memory",
			icon: BrainIcon,
			label: t("navigation.memory"), // 记忆
		},
		{
			to: "/commands",
			icon: TerminalIcon,
			label: t("navigation.commands"), // 命令
		},
		{
			to: "/codex/settings",
			icon: SettingsIcon,
			label: t("navigation.settings"), // 设置
		},
	];

	// Determine which links to show
	const currentLinks = activeModule === "codex" ? codexLinks : claudeLinks;

	return (
		<div className="min-h-screen bg-background flex flex-col relative">
			{/* Custom Title Bar Region */}
			<div
				data-tauri-drag-region
				className="h-10 w-full absolute top-0 left-0 z-50"
				style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
			/>

			{/* Window Controls for Windows/Linux */}
			{!isMacOS && (
				<div className="absolute top-2 right-2 z-50">
					<WindowControls />
				</div>
			)}

			{/* Floating Home Button */}
			<button
				onClick={() => navigate("/")}
				className="absolute bottom-8 right-8 h-12 w-12 bg-primary text-primary-foreground rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center"
				title="Back to Home"
			>
				<LayoutGridIcon size={20} />
			</button>

			<div className="flex flex-1 overflow-hidden pt-6">
				<nav
					className="w-[200px] bg-background border-r flex flex-col"
					data-tauri-drag-region
				>
					<div
						className="flex flex-col flex-1 justify-between mt-4"
						data-tauri-drag-region
					>
						<ul className="px-3 pt-3 space-y-2">
							{currentLinks.map((link) => (
								<li key={link.to}>
									<NavLink
										to={link.to}
										end={link.end}
										onClick={link.onClick}
										className={({ isActive }) =>
											cn(
												"flex items-center gap-2 px-3 py-2 rounded-xl cursor-default select-none ",
												{
													"bg-primary text-primary-foreground": isActive && link.to !== "#",
													"hover:bg-accent hover:text-accent-foreground":
														!isActive,
													"opacity-50 cursor-not-allowed": link.to === "#",
												},
											)
										}
									>
										<link.icon size={14} />
										{link.label}
									</NavLink>
								</li>
							))}
						</ul>

						<div className="space-y-2">
							<UpdateButton />
						</div>
					</div>
				</nav>
				{isProjectsRoute ? (
					<main
						className="flex-1 h-screen overflow-hidden"
						data-tauri-drag-region
					>
						<Outlet />
					</main>
				) : (
					<ScrollArea className="flex-1 h-full [&>div>div]:!block">
						<main className="" data-tauri-drag-region>
							<Outlet />
						</main>
					</ScrollArea>
				)}
			</div>
		</div>
	);
}
