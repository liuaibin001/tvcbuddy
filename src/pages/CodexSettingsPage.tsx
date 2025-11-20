import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCodexGlobalSettings, useUpdateCodexGlobalSettings } from "@/lib/query";
import { cn } from "@/lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeftIcon, FolderIcon, SaveIcon, Settings2Icon, ShieldAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function CodexSettingsPage() {
    const navigate = useNavigate();
    const { data: settings } = useCodexGlobalSettings();
    const updateSettingsMutation = useUpdateCodexGlobalSettings();

    const [enabled, setEnabled] = useState(false);
    const [rootPath, setRootPath] = useState("");

    useEffect(() => {
        if (settings) {
            setEnabled(settings.enabled);
            setRootPath(settings.root_path);
        }
    }, [settings]);

    const handleSave = () => {
        updateSettingsMutation.mutate({
            enabled,
            root_path: rootPath,
        });
    };

    const handleSelectRootPath = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Project Root Directory",
            });
            if (selected && typeof selected === "string") {
                setRootPath(selected);
            }
        } catch (error) {
            console.error("Failed to open directory dialog:", error);
        }
    };

    return (
        <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/codex")} className="mr-4">
                    <ArrowLeftIcon size={20} />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold leading-none">Global Settings</h1>
                    <span className="text-xs text-muted-foreground mt-1">Configure Codex behavior</span>
                </div>
            </header>

            <main className="flex-1 container max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
                {/* Left: Form */}
                <div className="lg:col-span-7 space-y-10 py-4 overflow-y-auto pr-2 scrollbar-hide">
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            <Settings2Icon size={14} />
                            <span>General Configuration</span>
                        </div>

                        <div className="space-y-8">
                            {/* Enable Switch */}
                            <div className="flex items-center justify-between group p-4 border rounded-xl hover:bg-accent/30 transition-colors">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium">Enable Codex</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Master switch to enable or disable all Codex AI features.
                                    </p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            {/* Root Path Input */}
                            <div className="group">
                                <Label className="text-xs font-normal text-muted-foreground mb-1.5 block group-focus-within:text-primary transition-colors">
                                    PROJECT ROOT PATH
                                </Label>
                                <div className="relative cursor-pointer" onClick={handleSelectRootPath}>
                                    <Input
                                        value={rootPath}
                                        readOnly
                                        placeholder="/path/to/projects"
                                        className="h-12 text-lg bg-transparent border-0 border-b border-input rounded-none px-0 pl-8 focus-visible:ring-0 focus-visible:border-primary transition-all placeholder:text-muted-foreground/30 font-mono cursor-pointer hover:border-primary/50"
                                    />
                                    <FolderIcon size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Click to select the base directory where Codex will look for project configurations.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons (Moved from Header) */}
                    <div className="flex items-center gap-4 pt-4">
                        <Button onClick={handleSave} className="gap-2">
                            <SaveIcon size={16} />
                            Save Changes
                        </Button>
                        <Button variant="ghost" onClick={() => navigate("/codex")}>
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Right: Info Pane */}
                <div className="lg:col-span-5 py-4 overflow-hidden">
                    <div className="space-y-6">
                        <div className="bg-muted/30 rounded-xl border p-6 space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h3 className="font-semibold text-sm">System Status</h3>
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
                                    enabled ? "text-green-600 bg-green-500/10" : "text-yellow-600 bg-yellow-500/10"
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", enabled ? "bg-green-500" : "bg-yellow-500")} />
                                    {enabled ? "System Active" : "System Paused"}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Root</span>
                                    <div className="flex items-center gap-2">
                                        <FolderIcon size={14} className="text-muted-foreground" />
                                        <span className="text-sm font-mono break-all bg-background px-2 py-1 rounded border">
                                            {rootPath || "Not configured"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                    <ShieldAlertIcon size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Changing the root path may require restarting the application for all file watchers to update correctly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
