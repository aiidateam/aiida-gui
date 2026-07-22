import type { ReactNode } from "react";

export interface PluginHomeItem {
  label: string;
  path: string;
}

export interface PluginSidebarItem extends PluginHomeItem {
  icon?: unknown;
}

export interface PluginDefinition {
  dataView?: Record<string, unknown>;
  routes?: Record<string, React.ComponentType<Record<string, unknown>>>;
  homeItems?: Record<string, PluginHomeItem>;
  sideBarItems?: Record<string, PluginSidebarItem>;
}

export interface PluginContextValue {
  dataViews: Record<string, unknown>;
  routes: Record<string, React.ComponentType<Record<string, unknown>>>;
  homeItems: Record<string, PluginHomeItem>;
  sideBarItems: Record<string, PluginSidebarItem>;
}

export interface PluginProviderProps {
  pluginNames: string[];
  children: ReactNode;
}
