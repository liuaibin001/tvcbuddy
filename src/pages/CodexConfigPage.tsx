import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCodexStores, useCreateCodexStore, useUpdateCodexStore } from "@/lib/query";
import { ArrowLeftIcon, CheckCircle2, Code2, Globe, SaveIcon, Server, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function CodexConfigPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const { data: stores } = useCodexStores();
    const createStoreMutation = useCreateCodexStore();
    const updateStoreMutation = useUpdateCodexStore();

    // State
    const [platform, setPlatform] = useState<"tvc" | "lightai" | "custom">("tvc");
    const [name, setName] = useState("");
    const [url, setUrl] = useState("https://claude.tvc-mall.com/openai");
    const [model, setModel] = useState("gpt-5-codex");
    const [apiKey, setApiKey] = useState("");

    // Load existing data if in edit mode
    useEffect(() => {
        if (isEditMode && stores) {
            const store = stores.find((s) => s.id === id);
            if (store) {
                setName(store.title);
                const config = store.config as any;
                setPlatform(config.platform || "custom");
                setUrl(config.url || "");
                setModel(config.model || "");
                setApiKey(config.api_key || "");
            }
        }
    }, [isEditMode, id, stores]);

    // Platform selection – also sets default name if creating new
    const handlePlatformSelect = (p: "tvc" | "lightai" | "custom") => {
        setPlatform(p);
        // Only auto-set defaults if NOT in edit mode or if user explicitly changes platform
        // But for edit mode, we might want to keep existing values unless user wants to reset.
        // Simple logic: if switching platform, apply defaults.
        if (p === "tvc") {
            if (!isEditMode && !name) setName("TVC 配置");
            setUrl("https://claude.tvc-mall.com/openai");
            setModel("gpt-5-codex");
        } else if (p === "lightai") {
            if (!isEditMode && !name) setName("LightAI 配置");
            setUrl("https://api.lightai.io/v1");
            setModel("gpt-5-codex");
        } else {
            setUrl("");
            setModel("gpt-5-codex");
        }
    };

    const handleSave = async () => {
        if (!name) {
            toast.error("Please enter a configuration name");
            return;
        }

        if (!/^[a-zA-Z0-9]+$/.test(name)) {
            toast.error("Configuration name must contain only letters and numbers");
            return;
        }

        const configData = {
            platform,
            url,
            model,
            ...(apiKey ? { api_key: apiKey } : {}),
            approval_policy: "on-request",
        };

        try {
            if (isEditMode && id) {
                await updateStoreMutation.mutateAsync({
                    id,
                    title: name,
                    config: configData,
                });
                // toast handled in mutation
            } else {
                await createStoreMutation.mutateAsync({
                    title: name,
                    config: configData,
                });
                // toast handled in mutation
            }
            navigate("/codex");
        } catch (error) {
            console.error(error);
            // toast handled in mutation
        }
    };

    // Live preview data
    const previewData = useMemo(
        () => ({
            platform: platform.toUpperCase(),
            endpoint: url || "<empty>",
            model: model || "<empty>",
            security: apiKey ? "Authenticated" : "Public / No Key",
        }),
        [platform, url, model, apiKey]
    );

    return (
        <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/codex")} className="mr-4">
                    <ArrowLeftIcon size={20} />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold leading-none">{isEditMode ? "Edit Connection" : "New Connection"}</h1>
                    <span className="text-xs text-muted-foreground mt-1">Configure your AI provider</span>
                </div>
            </header>

            <main className="flex-1 container max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
                {/* Left: Form */}
                <div className="lg:col-span-7 space-y-10 py-4 overflow-y-auto pr-2 scrollbar-hide">
                    {/* Platform selection */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            <Globe size={14} />
                            <span>Provider Strategy</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <PlatformCard
                                title="TVC"
                                icon={<Server size={20} />}
                                selected={platform === "tvc"}
                                onClick={() => handlePlatformSelect("tvc")}
                            />
                            <PlatformCard
                                title="LightAI"
                                icon={<Zap size={20} />}
                                selected={platform === "lightai"}
                                onClick={() => handlePlatformSelect("lightai")}
                            />
                            <PlatformCard
                                title="Custom"
                                icon={<Code2 size={20} />}
                                selected={platform === "custom"}
                                onClick={() => handlePlatformSelect("custom")}
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
                                    placeholder="e.g. Production Codex"
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

                            <div className="grid grid-cols-2 gap-6">
                                <div className="group">
                                    <Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
                                        MODEL IDENTIFIER
                                    </Label>
                                    <Input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="gpt-5-codex"
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
                        </div>
                    </section>

                    {/* Action Buttons (Moved from Header) */}
                    <div className="flex items-center gap-4 pt-4">
                        <Button onClick={handleSave} className="gap-2">
                            <SaveIcon size={16} />
                            {isEditMode ? "Update & Connect" : "Save & Connect"}
                        </Button>
                        <Button variant="ghost" onClick={() => navigate("/codex")}>
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Right: Live preview */}
                <div className="lg:col-span-5 py-4 overflow-hidden">
                    <div className="space-y-6">
                        <div className="bg-muted/30 rounded-xl border p-6 space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h3 className="font-semibold text-sm">Connection Preview</h3>
                                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Ready to configure
                                </div>
                            </div>
                            <div className="space-y-4">
                                <PreviewItem label="Provider" value={previewData.platform} />
                                <PreviewItem label="Target URL" value={previewData.endpoint} mono />
                                <PreviewItem label="Model" value={previewData.model} mono />
                                <PreviewItem
                                    label="Security"
                                    value={previewData.security}
                                    icon={<ShieldCheck size={12} className="text-primary" />}
                                />
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    This configuration will be saved locally. The API key is stored securely and is only used to sign requests to the
                                    specified endpoint.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function PlatformCard({ title, icon, selected, onClick }: { title: string; icon: React.ReactNode; selected: boolean; onClick: () => void }) {
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
