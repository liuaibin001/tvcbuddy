import { GlobeIcon, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn, isMacOS } from "@/lib/utils";
import { WindowControls } from "@/components/WindowControls";
import ClaudeSvg from "@/assets/claude.svg?react";
import OpenAISvg from "@/assets/openai.svg?react";

export function WelcomePage() {
    const navigate = useNavigate();

    const cards = [
        {
            id: "claude",
            title: "Claude",
            description: "AI Assistant Configuration",
            icon: ClaudeSvg,
            path: "/claude",
            gradient: "from-purple-500/20 to-blue-500/20",
            border: "group-hover:border-purple-500/50",
            iconColor: "text-purple-500",
        },
        {
            id: "codex",
            title: "Codex",
            description: "Knowledge Base & Indexing",
            icon: OpenAISvg,
            path: "/codex",
            gradient: "from-blue-500/20 to-cyan-500/20",
            border: "group-hover:border-blue-500/50",
            iconColor: "text-blue-500",
        },
        {
            id: "proxy",
            title: "Local Proxy",
            description: "Network & Traffic Control",
            icon: GlobeIcon,
            path: "/proxy",
            gradient: "from-emerald-500/20 to-green-500/20",
            border: "group-hover:border-emerald-500/50",
            iconColor: "text-emerald-500",
        },
    ];

    return (
        <div className="h-screen w-full bg-background relative overflow-hidden flex flex-col">
            {/* Custom Title Bar Region for Dragging */}
            <div
                data-tauri-drag-region
                className="h-10 w-full absolute top-0 left-0 z-40"
                style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            />

            {/* Window Controls for Windows/Linux */}
            {!isMacOS && (
                <div className="absolute top-2 right-2 z-50">
                    <WindowControls />
                </div>
            )}

            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
                <div className="max-w-5xl w-full space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            TVCBuddy
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                            Your all-in-one workspace for AI configuration and local services.
                        </p>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {cards.map((card) => (
                            <div
                                key={card.id}
                                onClick={() => navigate(card.path)}
                                className={cn(
                                    "group relative h-[280px] rounded-3xl border bg-card/50 backdrop-blur-sm p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5",
                                    card.border,
                                )}
                            >
                                <div
                                    className={cn(
                                        "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                                        card.gradient,
                                    )}
                                />

                                <div className="relative h-full flex flex-col justify-between z-10">
                                    <div className={cn("p-4 rounded-2xl bg-background/80 w-fit", card.iconColor)}>
                                        <card.icon className="w-8 h-8" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-2xl">{card.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {card.description}
                                        </p>
                                    </div>

                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                                        <svg
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={card.iconColor}
                                        >
                                            <path
                                                d="M5 12H19M19 12L12 5M19 12L12 19"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card */}
                        <div
                            onClick={() => toast.info("此功能马上就来", { description: "Feature coming soon!" })}
                            className="group h-[280px] rounded-3xl border-2 border-dashed border-muted hover:border-primary/50 bg-transparent p-6 cursor-pointer transition-all duration-300 hover:bg-accent/5 flex flex-col items-center justify-center gap-4"
                        >
                            <div className="p-4 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                                <PlusIcon size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                Add Module
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-6 w-full text-center text-xs text-muted-foreground/50">
                v{import.meta.env.PACKAGE_VERSION || "0.2.0"} • TVCBuddy
            </div>
        </div>
    );
}
