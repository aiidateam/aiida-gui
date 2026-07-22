import React, { createContext, useState, useEffect, useContext } from "react";
import type {
  PluginContextValue,
  PluginDefinition,
  PluginProviderProps,
} from "../types/plugin";

const PluginContext = createContext<PluginContextValue | undefined>(undefined);

export function PluginProvider({ pluginNames, children }: PluginProviderProps) {
  const [dataViews, setDataViews] = useState<Record<string, unknown>>({});
  const [routes, setRoutes] = useState<PluginContextValue["routes"]>({});
  const [homeItems, setHomeItems] = useState<PluginContextValue["homeItems"]>(
    {},
  );
  const [sideBarItems, setSideBarItems] = useState<
    PluginContextValue["sideBarItems"]
  >({});

  useEffect(() => {
    if (!pluginNames.length) {
      setDataViews({});
      setRoutes({});
      setHomeItems({});
      setSideBarItems({});
      return;
    }

    let cancelled = false;

    async function loadPlugins() {
      const mergedDataViews: Record<string, unknown> = {};
      const mergedRoutes: PluginContextValue["routes"] = {};
      const mergedHomeItems: PluginContextValue["homeItems"] = {};
      const mergedSideBarItems: PluginContextValue["sideBarItems"] = {};

      for (const name of pluginNames) {
        try {
          // This path is intentionally resolved at runtime by the backend plugin system.
          const moduleValue = await import(
            /* @vite-ignore */
            /* webpackIgnore: true */
            `/plugins/${name}/static/${name}.esm.js`
          );
          const definition = (moduleValue.default ||
            moduleValue) as PluginDefinition;
          if (definition.dataView) {
            Object.assign(mergedDataViews, definition.dataView);
          }
          if (definition.routes) {
            Object.assign(mergedRoutes, definition.routes);
          }
          if (definition.homeItems) {
            Object.assign(mergedHomeItems, definition.homeItems);
          }
          if (definition.sideBarItems) {
            Object.assign(mergedSideBarItems, definition.sideBarItems);
          }
        } catch (error) {
          console.error(`Failed to load plugin "${name}":`, error);
        }
      }

      if (!cancelled) {
        setDataViews(mergedDataViews);
        setRoutes(mergedRoutes);
        setHomeItems(mergedHomeItems);
        setSideBarItems(mergedSideBarItems);
      }
    }

    loadPlugins();
    return () => {
      cancelled = true;
    };
  }, [pluginNames]);

  return (
    <PluginContext.Provider
      value={{ dataViews, routes, homeItems, sideBarItems }}
    >
      {children}
    </PluginContext.Provider>
  );
}

export function usePluginContext(): PluginContextValue {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("usePluginContext must be used within PluginProvider");
  }
  return context;
}
