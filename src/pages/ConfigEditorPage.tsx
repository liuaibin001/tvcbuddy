import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCreateConfig, useStore, useUpdateConfig } from "@/lib/query";
import { ArrowLeftIcon, CheckCircle2, Code2, Globe, SaveIcon, Server, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type ProviderType = "zhipu" | "tvc" | "kimi" | "custom";

interface ProviderConfig {
	name: string;
	url: string;
	mainModel: string;
	haikuModel: string;
	sonnetModel: string;
	opusModel: string;
}

const PROVIDER_PRESETS: Record<ProviderType, Partial<ProviderConfig>> = {
	zhipu: {
		name: "智谱",
		url: "https://open.bigmodel.cn/api/anthropic",
		mainModel: "glm-4.6",
		haikuModel: "glm-4.5-air",
		sonnetModel: "glm-4.6",
		opusModel: "glm-4.6",
	},
	tvc: {
		name: "TVC",
		url: "https://claude.tvc-mall.com/api",
		mainModel: "claude-sonnet-4-5-20250929",
		haikuModel: "claude-haiku-4-5-20251001",
		sonnetModel: "claude-sonnet-4-5-20250929",
		opusModel: "claude-opus-4-1-20250805",
	},
	kimi: {
		name: "Kimi k2",
		url: "https://api.moonshot.cn/anthropic",
		mainModel: "kimi-k2-thinking",
		haikuModel: "kimi-k2-thinking",
		sonnetModel: "kimi-k2-thinking",
		opusModel: "kimi-k2-thinking",
	},
	custom: {
		name: "",
		url: "",
		mainModel: "",
		haikuModel: "",
		sonnetModel: "",
		opusModel: "",
	},
};

export function ConfigEditorPage() {
	const navigate = useNavigate();
	const { storeId } = useParams();
	const isEditMode = !!storeId;

	const { data: existingStore } = useStore(storeId || "");
	const createConfigMutation = useCreateConfig();
	const updateConfigMutation = useUpdateConfig();

	// State
	const [provider, setProvider] = useState<ProviderType>("zhipu");
	const [name, setName] = useState("");
	const [url, setUrl] = useState("https://open.bigmodel.cn/api/anthropic");
	const [apiKey, setApiKey] = useState("");
	const [mainModel, setMainModel] = useState("glm-4.6");
	const [haikuModel, setHaikuModel] = useState("glm-4.5-air");
	const [sonnetModel, setSonnetModel] = useState("glm-4.6");
	const [opusModel, setOpusModel] = useState("glm-4.6");

	// Load existing data if in edit mode
	useEffect(() => {
		if (isEditMode && existingStore) {
			setName(existingStore.title);
			const env = existingStore.settings?.env || {};

			// Determine provider type based on URL
			const baseUrl = env.ANTHROPIC_BASE_URL || "";
			if (baseUrl.includes("bigmodel.cn")) {
				setProvider("zhipu");
			} else if (baseUrl.includes("tvc-mall.com")) {
				setProvider("tvc");
			} else if (baseUrl.includes("moonshot.cn")) {
				setProvider("kimi");
			} else {
				setProvider("custom");
			}

			setUrl(env.ANTHROPIC_BASE_URL || "");
			setApiKey(env.ANTHROPIC_AUTH_TOKEN || "");
			setMainModel(env.ANTHROPIC_MODEL || "");
			setHaikuModel(env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "");
			setSonnetModel(env.ANTHROPIC_DEFAULT_SONNET_MODEL || "");
			setOpusModel(env.ANTHROPIC_DEFAULT_OPUS_MODEL || "");
		}
	}, [isEditMode, existingStore]);

	// Handle provider selection
	const handleProviderSelect = (p: ProviderType) => {
		setProvider(p);
		const preset = PROVIDER_PRESETS[p];

		// Only apply defaults if NOT in edit mode
		if (!isEditMode) {
			setName(preset.name || "");
			setUrl(preset.url || "");
			setMainModel(preset.mainModel || "");
			setHaikuModel(preset.haikuModel || "");
			setSonnetModel(preset.sonnetModel || "");
			setOpusModel(preset.opusModel || "");
		}
	};

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Please enter a configuration name");
			return;
		}

		if (!url.trim()) {
			toast.error("Please enter API endpoint");
			return;
		}

		const settings = {
			env: {
				ANTHROPIC_BASE_URL: url,
				...(apiKey ? { ANTHROPIC_AUTH_TOKEN: apiKey } : {}),
				...(mainModel ? { ANTHROPIC_MODEL: mainModel } : {}),
				...(haikuModel ? { ANTHROPIC_DEFAULT_HAIKU_MODEL: haikuModel } : {}),
				...(sonnetModel ? { ANTHROPIC_DEFAULT_SONNET_MODEL: sonnetModel } : {}),
				...(opusModel ? { ANTHROPIC_DEFAULT_OPUS_MODEL: opusModel } : {}),
			},
		};

		try {
			if (isEditMode && storeId) {
				await updateConfigMutation.mutateAsync({
					storeId,
					title: name,
					settings,
				});
			} else {
				await createConfigMutation.mutateAsync({
					title: name,
					settings,
				});
			}
			navigate("/claude");
		} catch (error) {
			console.error(error);
		}
	};

	// Live preview data
	const previewData = useMemo(
		() => ({
			provider: provider.toUpperCase(),
			endpoint: url || "<empty>",
			mainModel: mainModel || "<empty>",
			security: apiKey ? "Authenticated" : "Public / No Key",
		}),
		[provider, url, mainModel, apiKey]
	);

	return (
		<div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
			{/* Header */}
			<header className="h-16 border-b flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 shrink-0">
				<Button variant="ghost" size="icon" onClick={() => navigate("/claude")} className="mr-4">
					<ArrowLeftIcon size={20} />
				</Button>
				<div className="flex flex-col">
					<h1 className="text-lg font-semibold leading-none">{isEditMode ? "Edit Configuration" : "New Configuration"}</h1>
					<span className="text-xs text-muted-foreground mt-1">Configure your Claude AI provider</span>
				</div>
			</header>

			<main className="flex-1 container max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
				{/* Left: Form */}
				<div className="lg:col-span-7 space-y-10 py-4 overflow-y-auto pr-2 scrollbar-hide">
					{/* Provider selection */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
							<Globe size={14} />
							<span>Provider Strategy</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<ProviderCard
								title="Zhipu GLM"
								icon={<Sparkles size={20} />}
								selected={provider === "zhipu"}
								onClick={() => handleProviderSelect("zhipu")}
							/>
							<ProviderCard
								title="TVC"
								icon={<Server size={20} />}
								selected={provider === "tvc"}
								onClick={() => handleProviderSelect("tvc")}
							/>
							<ProviderCard
								title="Kimi k2"
								icon={<Sparkles size={20} />}
								selected={provider === "kimi"}
								onClick={() => handleProviderSelect("kimi")}
							/>
							<ProviderCard
								title="Custom"
								icon={<Code2 size={20} />}
								selected={provider === "custom"}
								onClick={() => handleProviderSelect("custom")}
							/>
						</div>
					</section>

					{/* Connection details */}
					<section className="space-y-6">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
							<Server size={14} />
							<span>Connection Details</span>
						</div>
						<div className="space-y-6">
							<div className="group">
								<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
									CONFIGURATION NAME
								</Label>
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. 智谱 GLM"
									className="h-12 text-lg bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all placeholder:text-muted-foreground/30"
								/>
							</div>

							<div className="group">
								<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
									API ENDPOINT
								</Label>
								<Input
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://..."
									className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
								/>
							</div>

							<div className="group">
								<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
									API KEY (OPTIONAL)
								</Label>
								<Input
									type="password"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									placeholder="sk-..."
									className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
								/>
							</div>
						</div>
					</section>

					{/* Model Configuration */}
					<section className="space-y-6">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
							<Sparkles size={14} />
							<span>Model Configuration</span>
						</div>
						<div className="space-y-6">
							<div className="group">
								<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
									主模型 (MAIN MODEL)
								</Label>
								<Input
									value={mainModel}
									onChange={(e) => setMainModel(e.target.value)}
									placeholder="glm-4.6"
									className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
								<div className="group">
									<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
										HAIKU MODEL
									</Label>
									<Input
										value={haikuModel}
										onChange={(e) => setHaikuModel(e.target.value)}
										placeholder="glm-4.5-air"
										className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
									/>
								</div>
								<div className="group">
									<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
										SONNET MODEL
									</Label>
									<Input
										value={sonnetModel}
										onChange={(e) => setSonnetModel(e.target.value)}
										placeholder="glm-4.6"
										className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
									/>
								</div>
								<div className="group">
									<Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
										OPUS MODEL
									</Label>
									<Input
										value={opusModel}
										onChange={(e) => setOpusModel(e.target.value)}
										placeholder="glm-4.6"
										className="h-10 font-mono text-sm bg-transparent border-0 border-b border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Action Buttons */}
					<div className="flex items-center gap-4 pt-4">
						<Button onClick={handleSave} className="gap-2">
							<SaveIcon size={16} />
							{isEditMode ? "Update Configuration" : "Save Configuration"}
						</Button>
						<Button variant="ghost" onClick={() => navigate("/claude")}>
							Cancel
						</Button>
					</div>
				</div>

				{/* Right: Live preview */}
				<div className="lg:col-span-5 py-4 overflow-hidden">
					<div className="space-y-6">
						<div className="bg-muted/30 rounded-xl border p-6 space-y-6">
							<div className="flex items-center justify-between border-b pb-4">
								<h3 className="font-semibold text-sm">Configuration Preview</h3>
								<div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
									<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Ready to configure
								</div>
							</div>
							<div className="space-y-4">
								<PreviewItem label="Provider" value={previewData.provider} />
								<PreviewItem label="Target URL" value={previewData.endpoint} mono />
								<PreviewItem label="Main Model" value={previewData.mainModel} mono />
								<PreviewItem
									label="Security"
									value={previewData.security}
									icon={<ShieldCheck size={12} className="text-primary" />}
								/>
							</div>
							<div className="pt-4 border-t">
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground leading-relaxed">
										This configuration will be saved locally and applied to Claude Code.
									</p>
									<div className="text-xs space-y-1 text-muted-foreground">
										<div className="font-mono text-[10px] bg-muted/50 p-2 rounded">
											<div>ANTHROPIC_BASE_URL={url || "<empty>"}</div>
											{apiKey && <div>ANTHROPIC_AUTH_TOKEN=***</div>}
											{mainModel && <div>ANTHROPIC_MODEL={mainModel}</div>}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

function ProviderCard({ title, icon, selected, onClick }: { title: string; icon: React.ReactNode; selected: boolean; onClick: () => void }) {
	return (
		<div
			onClick={onClick}
			className={cn(
				"cursor-pointer relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:bg-accent/50",
				selected ? "border-primary bg-primary/5 text-primary" : "border-muted bg-background text-muted-foreground hover:border-muted-foreground/50"
			)}
		>
			{selected && (
				<div className="absolute top-3 right-3 text-primary">
					<CheckCircle2 size={16} />
				</div>
			)}
			<div className={cn("transition-colors", selected ? "text-primary" : "text-muted-foreground")}>{icon}</div>
			<span className="font-medium text-sm">{title}</span>
		</div>
	);
}

function PreviewItem({ label, value, mono = false, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-muted-foreground">{label}</span>
			<div className="flex items-center gap-2">
				{icon}
				<span className={cn("font-medium text-foreground", mono && "font-mono text-xs")}>{value}</span>
			</div>
		</div>
	);
}
