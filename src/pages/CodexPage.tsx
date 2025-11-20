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
import { cn } from "@/lib/utils";
import { useCodexGlobalSettings, useCodexStores, useDeleteCodexStore, useSetUsingCodexStore } from "@/lib/query";
import { PencilLineIcon, PlusIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface ConnectionStatus {
    success: boolean;
    latency_ms: number;
    message?: string;
}

export function CodexPage() {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <CodexConfigList />
        </div>
    );
}

function CodexConfigList() {
    const navigate = useNavigate();
    const { data: stores } = useCodexStores();
    const setUsingStoreMutation = useSetUsingCodexStore();
    const deleteStoreMutation = useDeleteCodexStore();
    const { data: settings } = useCodexGlobalSettings();

    const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
    const [checking, setChecking] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (stores) {
            stores.forEach(store => {
                checkStatus(store.id, store.config);
            });
        }
    }, [stores]);

    const checkStatus = async (id: string, config: any) => {
        if (checking[id]) return;

        setChecking(prev => ({ ...prev, [id]: true }));
        try {
            const status = await invoke<ConnectionStatus>("check_codex_connection", {
                url: config.url || "",
                apiKey: config.api_key || "",
                model: config.model || ""
            });
            setStatuses(prev => ({ ...prev, [id]: status }));
        } catch (error) {
            console.error("Failed to check status for", id, error);
            setStatuses(prev => ({ ...prev, [id]: { success: false, latency_ms: 0, message: "Check failed" } }));
        } finally {
            setChecking(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleStoreClick = (storeId: string, isCurrentStore: boolean) => {
        if (!isCurrentStore) {
            if (!settings?.enabled) {
                toast.error("Please enable Codex in Global Settings first.");
                return;
            }
            setUsingStoreMutation.mutate(storeId);
        }
    };

    const onCreateStore = () => {
        navigate("/codex/new");
    };

    const onEditStore = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigate(`/codex/edit/${id}`);
    };

    const onDeleteStore = async (id: string) => {
        try {
            await deleteStoreMutation.mutateAsync(id);
            // toast handled in mutation
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
                        Codex Configurations
                    </h3>
                    <p className="text-xs text-muted-foreground" data-tauri-drag-region>
                        Manage your AI provider connections.
                    </p>
                </div>
                <Button onClick={onCreateStore} size="sm" className="h-8 gap-2 text-xs">
                    <PlusIcon size={14} />
                    New Connection
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 max-w-[1920px] mx-auto">
                    {stores?.map((store) => {
                        const isCurrentStore = store.using;
                        const status = statuses[store.id];
                        const isChecking = checking[store.id];

                        const isAvailable = status?.success ?? false;
                        const latency = status?.latency_ms ?? 0;

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
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className={cn("font-medium text-sm truncate", isCurrentStore ? "text-primary" : "text-foreground")}>
                                            {store.title}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        {isChecking ? (
                                            <span className="text-[10px] animate-pulse">Checking...</span>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", isAvailable ? "bg-green-500" : "bg-red-500")} />
                                                {isAvailable ? (
                                                    <span className="font-mono text-[10px]">{latency}ms</span>
                                                ) : (
                                                    <span className="text-[10px]">Offline</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active Indicator (Subtle Ping) */}
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
                                        onClick={(e) => onEditStore(e, store.id)}
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
