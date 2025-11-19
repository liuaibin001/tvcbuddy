import { zodResolver } from "@hookform/resolvers/zod";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderIcon, SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    type CodexGlobalSettings,
    useCodexGlobalSettings,
    useUpdateCodexGlobalSettings,
} from "@/lib/query";

const settingsSchema = z.object({
    enabled: z.boolean(),
    root_path: z.string().min(1, "Root path is required"),
});

export function CodexSettingsPage() {
    const { data: settings, isLoading } = useCodexGlobalSettings();
    const mutation = useUpdateCodexGlobalSettings();

    const {
        register,
        control,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<CodexGlobalSettings>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            enabled: true,
            root_path: "",
        },
    });

    useEffect(() => {
        if (settings) {
            reset(settings);
        }
    }, [settings, reset]);

    const onSubmit = (data: CodexGlobalSettings) => {
        mutation.mutate(data);
    };

    const handleSelectPath = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Codex Root Directory",
                defaultPath: settings?.root_path || undefined,
            });

            if (selected) {
                const path = Array.isArray(selected) ? selected[0] : selected;
                setValue("root_path", path, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        } catch (err) {
            console.error("Failed to open dialog:", err);
            toast.error("Failed to open folder picker");
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Codex Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Global configuration for the Codex integration.
                    </p>
                </div>
                <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={!isDirty || mutation.isPending}
                >
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General</CardTitle>
                        <CardDescription>
                            Control the overall behavior of Codex.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable Codex</Label>
                                <p className="text-sm text-muted-foreground">
                                    Turn on to enable Codex features in the application.
                                </p>
                            </div>
                            <Controller
                                control={control}
                                name="enabled"
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Paths</CardTitle>
                        <CardDescription>
                            Configure where Codex stores its data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="root_path">Codex Root Directory</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="root_path"
                                    {...register("root_path")}
                                    placeholder="~/.codex"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleSelectPath}
                                >
                                    <FolderIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            {errors.root_path && (
                                <p className="text-sm text-red-500">
                                    {errors.root_path.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                The main directory for Codex configuration and data.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
