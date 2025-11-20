import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RouteWrapper } from "./components/RouteWrapper";
import { AgentsPage } from "./pages/AgentsPage";
import { CodexPage } from "./pages/CodexPage";
import { CodexConfigPage } from "./pages/CodexConfigPage";
import { CodexSettingsPage } from "./pages/CodexSettingsPage";
import { CommandsPage } from "./pages/CommandsPage";
import { ConfigEditorPage } from "./pages/ConfigEditorPage";
import { ConfigSwitcherPage } from "./pages/ConfigSwitcherPage";
import { MCPPage } from "./pages/MCPPage";
import { MemoryPage } from "./pages/MemoryPage";
import { NotificationPage } from "./pages/NotificationPage";
import { ProxyPage } from "./pages/ProxyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsagePage } from "./pages/UsagePage";
import { WelcomePage } from "./pages/WelcomePage";
import { Detail } from "./pages/projects/Detail";
import { ProjectsLayout } from "./pages/projects/Layout";
import { List } from "./pages/projects/List";

const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<RouteWrapper>
				<WelcomePage />
			</RouteWrapper>
		),
	},
	{
		element: (
			<RouteWrapper>
				<Layout />
			</RouteWrapper>
		),
		children: [
			{
				path: "claude",
				element: (
					<RouteWrapper>
						<ConfigSwitcherPage />
					</RouteWrapper>
				),
			},
			{
				path: "codex",
				element: (
					<RouteWrapper>
						<CodexPage />
					</RouteWrapper>
				),
			},
			{
				path: "codex/new",
				element: (
					<RouteWrapper>
						<CodexConfigPage />
					</RouteWrapper>
				),
			},
			{
				path: "codex/edit/:id",
				element: (
					<RouteWrapper>
						<CodexConfigPage />
					</RouteWrapper>
				),
			},
			{
				path: "codex/settings",
				element: (
					<RouteWrapper>
						<CodexSettingsPage />
					</RouteWrapper>
				),
			},
			{
				path: "proxy",
				element: (
					<RouteWrapper>
						<ProxyPage />
					</RouteWrapper>
				),
			},
			{
				path: "edit/:storeId",
				element: (
					<RouteWrapper>
						<ConfigEditorPage />
					</RouteWrapper>
				),
			},
			{
				path: "settings",
				element: (
					<RouteWrapper>
						<SettingsPage />
					</RouteWrapper>
				),
			},
			{
				path: "mcp",
				element: (
					<RouteWrapper>
						<MCPPage />
					</RouteWrapper>
				),
			},
			{
				path: "agents",
				element: (
					<RouteWrapper>
						<AgentsPage />
					</RouteWrapper>
				),
			},
			{
				path: "usage",
				element: (
					<RouteWrapper>
						<UsagePage />
					</RouteWrapper>
				),
			},
			{
				path: "memory",
				element: (
					<RouteWrapper>
						<MemoryPage />
					</RouteWrapper>
				),
			},
			{
				path: "notification",
				element: (
					<RouteWrapper>
						<NotificationPage />
					</RouteWrapper>
				),
			},
			{
				path: "commands",
				element: (
					<RouteWrapper>
						<CommandsPage />
					</RouteWrapper>
				),
			},
			{
				path: "projects",
				element: (
					<RouteWrapper>
						<ProjectsLayout />
					</RouteWrapper>
				),
				children: [
					{
						index: true,
						element: (
							<RouteWrapper>
								<List />
							</RouteWrapper>
						),
					},
					{
						path: ":path",
						element: (
							<RouteWrapper>
								<Detail />
							</RouteWrapper>
						),
					},
				],
			},
		],
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
