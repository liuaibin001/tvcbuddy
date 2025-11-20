import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActivityIcon, ArrowLeftIcon, GlobeIcon, NetworkIcon, RefreshCwIcon, Settings2Icon, ShieldCheckIcon, SignalIcon, WifiIcon, AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface NetworkInfo {
    interface_alias: string;
    local_ip: string;
    prefix_length: number;
    gateway: string;
    dns: string;
}

const NODES = [
    { id: "hk", name: "Hong Kong Node", gateway: "192.168.1.30", dns: "192.168.1.30", location: "Hong Kong" },
    { id: "us", name: "United States Node", gateway: "192.168.0.1", dns: "192.168.0.1", location: "United States" },
    { id: "cn", name: "Mainland Node", gateway: "192.168.1.1", dns: "192.168.1.1", location: "China" },
];

const TEST_SITES = [
    { id: "github", name: "GitHub", url: "https://github.com", icon: "Github" },
    { id: "gitlab", name: "GitLab", url: "https://gitlab.com", icon: "Gitlab" },
    { id: "google", name: "Google", url: "https://www.google.com", icon: "Chrome" },
    { id: "facebook", name: "Facebook", url: "https://www.facebook.com", icon: "Facebook" },
    { id: "x", name: "X (Twitter)", url: "https://twitter.com", icon: "Twitter" },
];

type Tab = "dashboard" | "network" | "settings";

export function ProxyPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [currentNode, setCurrentNode] = useState<string>("");
    const [isTesting, setIsTesting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(true);

    const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
    const [networkError, setNetworkError] = useState<string | null>(null);
    const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);

    const [publicIP, setPublicIP] = useState("Checking...");
    const [foreignIP, setForeignIP] = useState("Checking...");
    const [googleStatus, setGoogleStatus] = useState("Checking...");

    const [siteLatencies, setSiteLatencies] = useState<Record<string, number | null>>({});

    const checkAdminStatus = async () => {
        try {
            const admin = await invoke<boolean>("check_is_admin");
            setIsAdmin(admin);
            if (!admin) {
                toast.warning("Running without Administrator privileges. Network switching will be disabled.");
            }
        } catch (error) {
            console.error("Failed to check admin status:", error);
        }
    };

    const fetchNetworkInfo = async () => {
        setIsLoadingNetwork(true);
        setNetworkError(null);
        try {
            console.log("Fetching network info...");
            const info = await invoke<NetworkInfo>("get_system_network_info");
            console.log("Network info received:", info);
            setNetworkInfo(info);

            // Determine current node based on Gateway
            const matchedNode = NODES.find(n => n.gateway === info.gateway);
            if (matchedNode) {
                setCurrentNode(matchedNode.id);
            } else {
                setCurrentNode("custom");
            }
        } catch (error) {
            console.error("Failed to get network info:", error);
            setNetworkError(String(error));
            toast.error(`Failed to get network info: ${error}`);
        } finally {
            setIsLoadingNetwork(false);
        }
    };

    const fetchIPs = async () => {
        // Public IP (ISP)
        invoke<string>("get_public_ip", { url: "https://api.ipify.org?format=text" })
            .then(setPublicIP)
            .catch(() => setPublicIP("Error"));

        // Foreign IP (Cloudflare Trace or similar)
        invoke<string>("get_public_ip", { url: "https://ifconfig.me/ip" })
            .then(setForeignIP)
            .catch(() => setForeignIP("Unreachable"));

        // Google Connectivity
        invoke<number>("check_site_latency", { url: "https://www.google.com" })
            .then((latency) => setGoogleStatus(`Connected (${latency}ms)`))
            .catch(() => setGoogleStatus("Disconnected"));
    };

    const handleTestConnectivity = async () => {
        setIsTesting(true);
        setSiteLatencies({});

        // Refresh IPs
        fetchIPs();

        // Test Sites
        const newLatencies: Record<string, number> = {};

        await Promise.all(TEST_SITES.map(async (site) => {
            try {
                const latency = await invoke<number>("check_site_latency", { url: site.url });
                newLatencies[site.id] = latency;
                setSiteLatencies(prev => ({ ...prev, [site.id]: latency }));
            } catch (error) {
                console.error(`Failed to connect to ${site.name}:`, error);
                setSiteLatencies(prev => ({ ...prev, [site.id]: -1 })); // -1 indicates error
            }
        }));

        setIsTesting(false);
    };

    const handleNodeSwitch = async (nodeId: string) => {
        console.log("========== Node Switch Start ==========");
        console.log("Requested node ID:", nodeId);
        console.log("Is Admin:", isAdmin);
        console.log("Network Info:", networkInfo);

        if (!isAdmin) {
            console.error("Admin privileges required");
            toast.error("Administrator privileges required to switch nodes.");
            return;
        }

        if (!networkInfo) {
            console.error("Network info is null. Cannot switch node.");
            toast.error("Network info not available. Check console for details.");
            return;
        }

        const node = NODES.find(n => n.id === nodeId);
        if (!node) {
            console.error("Node not found:", nodeId);
            return;
        }

        console.log("Target node:", node);

        const toastId = toast.loading(`Switching to ${node.name}...`);

        const params = {
            interfaceAlias: networkInfo.interface_alias,
            ip: networkInfo.local_ip,
            prefixLength: networkInfo.prefix_length,
            gateway: node.gateway,
            dns: node.dns
        };

        console.log("Calling set_system_network_node with params:", params);

        try {
            // The backend now returns the updated network info after switching
            const updatedNetworkInfo = await invoke<NetworkInfo>("set_system_network_node", params);

            console.log("Node switch successful!");
            console.log("Updated network info:", updatedNetworkInfo);

            // Update network info with the returned data
            setNetworkInfo(updatedNetworkInfo);

            toast.success(`Switched to ${node.name}`, { id: toastId });
            setCurrentNode(nodeId);

            // Re-run connectivity tests with a slight delay
            setTimeout(handleTestConnectivity, 1000);

        } catch (error) {
            console.error("Failed to switch node:", error);
            console.error("Error details:", JSON.stringify(error));
            toast.error(`Failed to switch node: ${error}`, { id: toastId });
        }

        console.log("========== Node Switch End ==========");
    };

    useEffect(() => {
        checkAdminStatus();
        fetchNetworkInfo();
        handleTestConnectivity();
    }, []);

    return (
        <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mr-4">
                    <ArrowLeftIcon size={20} />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold leading-none">Local Proxy</h1>
                    <span className="text-xs text-muted-foreground mt-1">Network Management & Diagnostics</span>
                </div>
                {!isAdmin && (
                    <div className="ml-auto bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-xs font-medium border border-yellow-500/20 flex items-center gap-2">
                        <ShieldCheckIcon size={12} />
                        Admin Access Required for Switching
                    </div>
                )}
            </header>

            <main className="flex-1 container max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
                {/* Left Sidebar: Navigation */}
                <div className="lg:col-span-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                        Menu
                    </div>
                    <NavButton
                        active={activeTab === "dashboard"}
                        onClick={() => setActiveTab("dashboard")}
                        icon={<ActivityIcon size={18} />}
                        label="Network Status"
                        description="Real-time diagnostics"
                    />
                    <NavButton
                        active={activeTab === "network"}
                        onClick={() => setActiveTab("network")}
                        icon={<NetworkIcon size={18} />}
                        label="Node Switch"
                        description="Gateway & DNS"
                    />
                    <NavButton
                        active={activeTab === "settings"}
                        onClick={() => setActiveTab("settings")}
                        icon={<Settings2Icon size={18} />}
                        label="Settings"
                        description="Configuration"
                    />
                </div>

                {/* Right Content Area */}
                <div className="lg:col-span-9 h-full overflow-y-auto scrollbar-hide pb-10">
                    {activeTab === "dashboard" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* IP Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoCard
                                    title="Local Network"
                                    value={networkInfo?.local_ip || "Loading..."}
                                    subValue={networkInfo ? `Gateway: ${networkInfo.gateway}` : (isLoadingNetwork ? "Fetching..." : "Unknown")}
                                    icon={<WifiIcon className="text-blue-500" />}
                                    loading={isLoadingNetwork}
                                />
                                <InfoCard
                                    title="Public Network"
                                    value={publicIP}
                                    subValue="ISP External IP"
                                    icon={<GlobeIcon className="text-green-500" />}
                                    loading={publicIP === "Checking..."}
                                />
                                <InfoCard
                                    title="Foreign Access"
                                    value={foreignIP}
                                    subValue="Test via ifconfig.me"
                                    icon={<ShieldCheckIcon className="text-purple-500" />}
                                    loading={foreignIP === "Checking..."}
                                />
                                <InfoCard
                                    title="Google Connectivity"
                                    value={googleStatus}
                                    subValue="Direct Connection Test"
                                    icon={<SignalIcon className="text-yellow-500" />}
                                    loading={googleStatus === "Checking..."}
                                />
                            </div>

                            {/* Connectivity Test */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Connectivity Test</h3>
                                    <Button variant="outline" size="sm" onClick={handleTestConnectivity} disabled={isTesting} className="gap-2">
                                        <RefreshCwIcon size={14} className={cn(isTesting && "animate-spin")} />
                                        {isTesting ? "Testing..." : "Refresh Test"}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {TEST_SITES.map(site => {
                                        const latency = siteLatencies[site.id];
                                        const isError = latency === -1;
                                        const hasData = latency !== undefined && latency !== null;

                                        return (
                                            <div key={site.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                                                        {site.name[0]}
                                                    </div>
                                                    <span className="font-medium text-sm">{site.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasData ? (
                                                        isError ? (
                                                            <span className="text-xs text-destructive font-medium">Failed</span>
                                                        ) : (
                                                            <>
                                                                <span className={cn(
                                                                    "text-xs font-mono font-medium",
                                                                    (latency || 0) < 200 ? "text-green-500" : "text-yellow-500"
                                                                )}>
                                                                    {latency}ms
                                                                </span>
                                                                <div className={cn(
                                                                    "w-2 h-2 rounded-full",
                                                                    (latency || 0) < 200 ? "bg-green-500" : "bg-yellow-500"
                                                                )} />
                                                            </>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">--</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "network" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Network Node Selection</h2>
                                    <p className="text-sm text-muted-foreground">Select a node to switch your Gateway and DNS settings.</p>
                                    {networkInfo && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Current Interface: <span className="font-mono">{networkInfo.interface_alias}</span> ({networkInfo.local_ip})
                                        </p>
                                    )}
                                </div>
                            </div>

                            {networkError && (
                                <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-3">
                                    <AlertTriangleIcon size={20} className="shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-sm">Network Info Unavailable</h3>
                                        <p className="text-xs opacity-90 mt-1">{networkError}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 border-destructive/30 hover:bg-destructive/10 text-destructive"
                                            onClick={fetchNetworkInfo}
                                        >
                                            <RotateCcwIcon size={14} className="mr-2" />
                                            Retry Fetching Info
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                {NODES.map(node => (
                                    <div
                                        key={node.id}
                                        className={cn(
                                            "group relative flex items-center justify-between p-6 rounded-xl border-2 transition-all cursor-pointer",
                                            currentNode === node.id
                                                ? "border-primary bg-primary/5"
                                                : "border-muted bg-card hover:border-muted-foreground/30"
                                        )}
                                        onClick={() => handleNodeSwitch(node.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                currentNode === node.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                            )}>
                                                <NetworkIcon size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{node.name}</h3>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                    <span className="flex items-center gap-1">
                                                        Gateway: <span className="font-mono text-foreground">{node.gateway}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        DNS: <span className="font-mono text-foreground">{node.dns}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <Button
                                                variant={currentNode === node.id ? "default" : "outline"}
                                                size="sm"
                                                className="min-w-[100px]"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNodeSwitch(node.id);
                                                }}
                                                disabled={!isAdmin || !networkInfo}
                                            >
                                                {currentNode === node.id ? "Active" : "Activate"}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Settings2Icon size={48} className="mb-4 opacity-20" />
                            <p>Advanced settings coming soon...</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function NavButton({ active, onClick, icon, label, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; description: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200",
                active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            )}
        >
            <div className={cn(
                "p-2 rounded-lg bg-background/10",
                active ? "text-primary-foreground" : "text-foreground"
            )}>
                {icon}
            </div>
            <div>
                <div className="font-medium text-sm">{label}</div>
                <div className={cn("text-xs opacity-80", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{description}</div>
            </div>
        </button>
    );
}

function InfoCard({ title, value, subValue, icon, loading }: { title: string; value: string; subValue: string; icon: React.ReactNode; loading?: boolean }) {
    return (
        <div className="p-5 rounded-xl border bg-card/50 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
                {loading && <RefreshCwIcon size={14} className="animate-spin text-muted-foreground" />}
            </div>
            <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</h4>
                <div className="text-xl font-bold font-mono tracking-tight truncate" title={value}>
                    {value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            </div>
        </div>
    );
}
