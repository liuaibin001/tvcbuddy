import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function WindowControls({ className }: { className?: string }) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const updateMaximizedState = async () => {
            try {
                const win = getCurrentWindow();
                setIsMaximized(await win.isMaximized());
            } catch (e) {
                // Ignore errors during initialization (e.g. in browser)
            }
        };

        updateMaximizedState();

        let unlisten: (() => void) | undefined;
        const setupListener = async () => {
            try {
                // @ts-ignore
                unlisten = await getCurrentWindow().listen("tauri://resize", updateMaximizedState);
            } catch (e) {
                // Ignore errors
            }
        };
        setupListener();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const handleMinimize = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await getCurrentWindow().minimize();
        } catch (error) {
            console.error("Minimize failed:", error);
        }
    };

    const handleToggleMaximize = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const win = getCurrentWindow();
            await win.toggleMaximize();
            setIsMaximized(!isMaximized);
        } catch (error) {
            console.error("Maximize failed:", error);
        }
    };

    const handleClose = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await getCurrentWindow().close();
        } catch (error) {
            console.error("Close failed:", error);
        }
    };

    return (
        <div
            className={cn("flex items-center gap-0 z-[9999]", className)}
            data-tauri-no-drag
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <button
                onClick={handleMinimize}
                className="inline-flex items-center justify-center w-12 h-8 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border-none bg-transparent outline-none cursor-pointer"
                title="Minimize"
            >
                <Minus size={16} />
            </button>
            <button
                onClick={handleToggleMaximize}
                className="inline-flex items-center justify-center w-12 h-8 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border-none bg-transparent outline-none cursor-pointer"
                title={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? (
                    <Copy size={14} className="rotate-180" />
                ) : (
                    <Square size={14} />
                )}
            </button>
            <button
                onClick={handleClose}
                className="inline-flex items-center justify-center w-12 h-8 text-muted-foreground hover:bg-red-500 hover:text-white transition-colors border-none bg-transparent outline-none cursor-pointer"
                title="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
}
