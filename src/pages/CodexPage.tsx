import { PencilLineIcon, PlusIcon, ServerIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
    useCodexStores,
    useCreateCodexStore,
    useSetUsingCodexStore,
} from "@/lib/query";

export function CodexPage() {
    return (
        <div className="">
            <section>
                <CodexConfigList />
            </section>
        </div>
    );
}

function CodexConfigList() {
    const { data: stores } = useCodexStores();
    const setUsingStoreMutation = useSetUsingCodexStore();
    const createStoreMutation = useCreateCodexStore();

    const handleStoreClick = (storeId: string, isCurrentStore: boolean) => {
        if (!isCurrentStore) {
            setUsingStoreMutation.mutate(storeId);
        }
    };

    const onCreateStore = async () => {
        await createStoreMutation.mutateAsync({
            title: "New Codex Config",
            config: {
                model: "gpt-4-turbo",
                approval_policy: "on-request",
            },
        });
        toast.info("Config created! Editor coming soon.");
    };

    return (
        <div className="">
            <div
                className="flex items-center p-3 border-b px-3 justify-between sticky top-0 bg-background z-10"
                data-tauri-drag-region
            >
                <div data-tauri-drag-region>
                    <h3 className="font-bold" data-tauri-drag-region>
                        Codex Configurations
                    </h3>
                    <p className="text-sm text-muted-foreground" data-tauri-drag-region>
                        Manage your Codex configuration profiles.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                <div
                    role="button"
                    onClick={onCreateStore}
                    className="border border-dashed rounded-xl p-3 h-[100px] flex flex-col justify-center items-center gap-2 hover:bg-accent/50 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                >
                    <PlusIcon size={24} />
                    <span className="font-medium text-sm">Create New</span>
                </div>

                {stores.map((store) => {
                    const isCurrentStore = store.using;
                    return (
                        <div
                            role="button"
                            key={store.id}
                            onClick={() => handleStoreClick(store.id, isCurrentStore)}
                            className={cn(
                                "border rounded-xl p-3 h-[100px] flex flex-col justify-between transition-colors disabled:opacity-50",
                                {
                                    "bg-primary/10 border-primary border-2": isCurrentStore,
                                    "hover:bg-accent/50": !isCurrentStore,
                                },
                            )}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <ServerIcon size={14} className="text-muted-foreground" />
                                    <span className="font-medium truncate">{store.title}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                    Model: {store.config.model || "Default"}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    className="hover:bg-primary/10 rounded-lg p-2 hover:text-primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toast.info("Editor coming soon!");
                                    }}
                                >
                                    <PencilLineIcon className="text-muted-foreground" size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
