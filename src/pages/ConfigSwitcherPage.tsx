import { Kimi, Minimax, ZAI } from "@lobehub/icons";
import { EllipsisVerticalIcon, PencilLineIcon, PlusIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GLMDialog } from "@/components/GLMBanner";
import { KimiDialog } from "@/components/KimiDialog";
import { MiniMaxDialog } from "@/components/MiniMaxDialog";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	useDeleteConfig,
	useSetCurrentConfig,
	useStores,
	useSystemEnvConfig,
} from "../lib/query";

export function ConfigSwitcherPage() {
	return (
		<div className="h-full flex flex-col overflow-hidden bg-background">
			<ConfigStores />
		</div>
	);
}

function ConfigStores() {
	const { t } = useTranslation();
	const { data: stores } = useStores();
	const { data: systemEnvConfig } = useSystemEnvConfig();
	const setCurrentStoreMutation = useSetCurrentConfig();
	const deleteConfigMutation = useDeleteConfig();
	const navigate = useNavigate();

	const isOriginalConfigActive = !stores.some((store) => store.using);

	// Check if system env config already exists in saved configs
	const systemConfigExists = systemEnvConfig?.has_config && stores.some((store) => {
		const env = store.settings?.env as Record<string, string> | undefined;
		return (
			env?.ANTHROPIC_BASE_URL === systemEnvConfig.base_url &&
			env?.ANTHROPIC_AUTH_TOKEN === systemEnvConfig.auth_token
		);
	});

	// When system default config exists and no custom config is active, show system config as active
	const isSystemConfigActive = systemEnvConfig?.has_config && !systemConfigExists && isOriginalConfigActive;

	const handleStoreClick = (storeId: string, isCurrentStore: boolean) => {
		if (!isCurrentStore) {
			setCurrentStoreMutation.mutate(storeId);
		}
	};

	const handleSystemConfigClick = () => {
		navigate("/edit/system-default");
	};

	const onCreateStore = () => {
		// Navigate to new config page without creating store first
		navigate("/edit/new");
	};

	const onDeleteStore = async (storeId: string) => {
		try {
			await deleteConfigMutation.mutateAsync({ storeId });
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<>
			<div
				className="flex items-center px-6 py-4 border-b justify-between shrink-0 bg-background"
				data-tauri-drag-region
			>
				<div data-tauri-drag-region>
					<h3 className="font-bold text-lg" data-tauri-drag-region>
						{t("configSwitcher.title")}
					</h3>
					<p className="text-xs text-muted-foreground" data-tauri-drag-region>
						{t("configSwitcher.description")}
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
							<EllipsisVerticalIcon size={14} />
							AI Providers
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<GLMDialog
							trigger={
								<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
									<ZAI />
									{t("glm.useZhipuGlm")}
								</DropdownMenuItem>
							}
						/>
						<MiniMaxDialog
							trigger={
								<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
									<Minimax />
									{t("minimax.useMiniMax")}
								</DropdownMenuItem>
							}
						/>
						<KimiDialog
							trigger={
								<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
									<Kimi />
									{t("kimi.useKimi")}
								</DropdownMenuItem>
							}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 max-w-[1920px] mx-auto">
					{/* New Config Card */}
					<div
						onClick={onCreateStore}
						className="group relative flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-3 transition-all duration-200 cursor-pointer hover:shadow-sm hover:border-primary/50 hover:bg-primary/5"
					>
						{/* Icon */}
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
							<PlusIcon size={18} />
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0 flex flex-col justify-center">
							<h4 className="font-medium text-sm text-foreground">
								{t("configSwitcher.createConfig")}
							</h4>
							<p className="text-xs text-muted-foreground mt-0.5">
								Add new config
							</p>
						</div>
					</div>

					{/* System Default Config (from environment variables) */}
					{systemEnvConfig?.has_config && !systemConfigExists && (
						<div
							onClick={handleSystemConfigClick}
							className={cn(
								"group relative flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:shadow-sm hover:border-muted-foreground/30",
								isSystemConfigActive
									? "border-primary bg-primary/5"
									: "border-muted bg-card"
							)}
						>
							{/* Icon */}
							<div className={cn(
								"flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
								isSystemConfigActive ? "border-primary/20 bg-background text-primary" : "border-muted bg-muted/50 text-muted-foreground"
							)}>
								<ServerIcon size={18} />
							</div>

							{/* Content */}
							<div className="flex-1 min-w-0 flex flex-col justify-center">
								<h4 className={cn("font-medium text-sm truncate", isSystemConfigActive ? "text-primary" : "text-foreground")}>
									系统默认配置
								</h4>
								{systemEnvConfig.base_url && (
									<p className="text-xs text-muted-foreground mt-0.5 truncate" title={systemEnvConfig.base_url}>
										{systemEnvConfig.base_url}
									</p>
								)}
							</div>

							{/* Active Indicator */}
							{isSystemConfigActive && (
								<div className="absolute top-2 right-2 pointer-events-none">
									<span className="relative flex h-2 w-2">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
										<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
									</span>
								</div>
							)}

							{/* Edit button (hover) - only show when not active */}
							{!isSystemConfigActive && (
								<div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-background/95 backdrop-blur shadow-sm border rounded-md p-1 pointer-events-auto">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 hover:text-primary"
										onClick={(e) => {
											e.stopPropagation();
											handleSystemConfigClick();
										}}
									>
										<PencilLineIcon size={14} />
									</Button>
								</div>
							)}
						</div>
					)}

					{/* Custom Configs */}
					{stores.map((store) => {
						const isCurrentStore = store.using;
						return (
							<div
								key={store.id}
								onClick={() => handleStoreClick(store.id, isCurrentStore)}
								className={cn(
									"group relative flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:shadow-sm hover:border-muted-foreground/30",
									isCurrentStore
										? "border-primary bg-primary/5"
										: "border-muted bg-card"
								)}
							>
								{/* Icon */}
								<div className={cn(
									"flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
									isCurrentStore ? "border-primary/20 bg-background text-primary" : "border-muted bg-muted/50 text-muted-foreground"
								)}>
									<ServerIcon size={18} />
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0 flex flex-col justify-center">
									<h4 className={cn("font-medium text-sm truncate", isCurrentStore ? "text-primary" : "text-foreground")}>
										{store.title}
									</h4>
									{store.settings.env?.ANTHROPIC_BASE_URL && (
										<p className="text-xs text-muted-foreground mt-0.5 truncate" title={store.settings.env.ANTHROPIC_BASE_URL}>
											{store.settings.env.ANTHROPIC_BASE_URL}
										</p>
									)}
								</div>

								{/* Active Indicator */}
								{isCurrentStore && (
									<div className="absolute top-2 right-2">
										<span className="relative flex h-2 w-2">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
											<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
										</span>
									</div>
								)}

								{/* Actions (Hover Overlay) */}
								<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-background/95 backdrop-blur shadow-sm border rounded-md p-1 pl-1.5">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 hover:text-primary"
										onClick={(e) => {
											e.stopPropagation();
											navigate(`/edit/${store.id}`);
										}}
									>
										<PencilLineIcon size={14} />
									</Button>

									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 hover:text-destructive"
												onClick={(e) => e.stopPropagation()}
											>
												<Trash2Icon size={14} />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
												<AlertDialogDescription>
													This action cannot be undone. This will permanently delete the
													<span className="font-medium text-foreground"> {store.title} </span>
													configuration.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
												<AlertDialogAction
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
													onClick={(e) => {
														e.stopPropagation();
														onDeleteStore(store.id);
													}}
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
}
