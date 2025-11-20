import { Kimi, Minimax, ZAI } from "@lobehub/icons";
import { EllipsisVerticalIcon, PencilLineIcon, PlusIcon, ServerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GLMDialog } from "@/components/GLMBanner";
import { KimiDialog } from "@/components/KimiDialog";
import { MiniMaxDialog } from "@/components/MiniMaxDialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	useCreateConfig,
	useResetToOriginalConfig,
	useSetCurrentConfig,
	useStores,
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
	const setCurrentStoreMutation = useSetCurrentConfig();
	const resetToOriginalMutation = useResetToOriginalConfig();
	const navigate = useNavigate();

	const isOriginalConfigActive = !stores.some((store) => store.using);

	const handleStoreClick = (storeId: string, isCurrentStore: boolean) => {
		if (!isCurrentStore) {
			setCurrentStoreMutation.mutate(storeId);
		}
	};

	const handleOriginalConfigClick = () => {
		if (!isOriginalConfigActive) {
			resetToOriginalMutation.mutate();
		}
	};

	const createStoreMutation = useCreateConfig();

	const onCreateStore = async () => {
		const store = await createStoreMutation.mutateAsync({
			title: t("configSwitcher.newConfig"),
			settings: {},
		});
		navigate(`/edit/${store.id}`);
	};

	if (stores.length === 0) {
		return (
			<div
				className="flex justify-center items-center h-screen"
				data-tauri-drag-region
			>
				<div className="flex flex-col items-center gap-2">
					<Button variant="ghost" onClick={onCreateStore} className="">
						<PlusIcon size={14} />
						{t("configSwitcher.createConfig")}
					</Button>

					<p className="text-sm text-muted-foreground" data-tauri-drag-region>
						{t("configSwitcher.description")}
					</p>

					<div className="mt-4 space-y-2">
						<GLMDialog
							trigger={
								<Button
									variant="ghost"
									className="text-muted-foreground text-sm"
									size="sm"
								>
									<ZAI />
									{t("glm.useZhipuGlm")}
								</Button>
							}
						/>
						<MiniMaxDialog
							trigger={
								<Button
									variant="ghost"
									className="text-muted-foreground text-sm"
									size="sm"
								>
									<Minimax />
									{t("minimax.useMiniMax")}
								</Button>
							}
						/>
						<KimiDialog
							trigger={
								<Button
									variant="ghost"
									className="text-muted-foreground text-sm"
									size="sm"
								>
									<Kimi />
									{t("kimi.useKimi")}
								</Button>
							}
						/>
					</div>
				</div>
			</div>
		);
	}

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

					{/* Claude Original Config */}
					<div
						onClick={handleOriginalConfigClick}
						className={cn(
							"group relative flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:shadow-sm hover:border-muted-foreground/30",
							isOriginalConfigActive
								? "border-primary bg-primary/5"
								: "border-muted bg-card"
						)}
					>
						{/* Icon */}
						<div className={cn(
							"flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
							isOriginalConfigActive ? "border-primary/20 bg-background text-primary" : "border-muted bg-muted/50 text-muted-foreground"
						)}>
							<ServerIcon size={18} />
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0 flex flex-col justify-center">
							<h4 className={cn("font-medium text-sm truncate", isOriginalConfigActive ? "text-primary" : "text-foreground")}>
								{t("configSwitcher.originalConfig")}
							</h4>
							<p className="text-xs text-muted-foreground mt-0.5 truncate">
								{t("configSwitcher.originalConfigDescription")}
							</p>
						</div>

						{/* Active Indicator */}
						{isOriginalConfigActive && (
							<div className="absolute top-2 right-2">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
								</span>
							</div>
						)}
					</div>

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

								{/* Edit Button (Hover) */}
								<div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-background/95 backdrop-blur shadow-sm border rounded-md p-1">
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
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
}
