import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function WindowControls({ className }: { className?: string }) {
    const [isMaximized, setIsMaximized] = useState(false);

    const minimize = async () => {
        await getCurrentWindow().minimize();
    };

    const toggleMaximize = async () => {
        const win = getCurrentWindow();
        await win.toggleMaximize();
        setIsMaximized(!isMaximized);
    };

    const close = async () => {
        await getCurrentWindow().close();
    };

    return (
        <div className={cn("flex items-center z-50", className)} data-tauri-no-drag>
            <button
                onClick={minimize}
                className="p-2 hover:bg-accent/50 transition-colors rounded-md"
                title="Minimize"
            >
                <Minus size={16} />
            </button>
            <button
                onClick={toggleMaximize}
                className="p-2 hover:bg-accent/50 transition-colors rounded-md"
                title="Maximize"
            >
                <Square size={14} />
            </button>
            <button
                onClick={close}
                className="p-2 hover:bg-red-500/20 hover:text-red-500 transition-colors rounded-md"
                title="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
}
