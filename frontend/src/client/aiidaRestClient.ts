import { createAiidaRestClient } from "aiida-rest-client";
export { JsonApiError, type DaemonWorker } from "aiida-rest-client";

type BackendSettingsResponse = {
  aiida_restapi_base_url?: string;
  aiida_restapi_prefix?: string;
};

const defaultBaseUrl =
  import.meta.env.VITE_AIIDA_RESTAPI_BASE_URL || window.location.origin;
const defaultApiPrefix = import.meta.env.VITE_AIIDA_RESTAPI_PREFIX || "/v0";

let aiidaRestClientPromise: ReturnType<
  typeof createClientFromBackendSettings
> | null = null;

async function fetchBackendSettings(): Promise<BackendSettingsResponse> {
  try {
    const response = await fetch("/backend-setting", {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as BackendSettingsResponse;
  } catch {
    return {};
  }
}

async function createClientFromBackendSettings() {
  const backendSettings = await fetchBackendSettings();
  const baseUrl = backendSettings.aiida_restapi_base_url || defaultBaseUrl;
  const apiPrefix = backendSettings.aiida_restapi_prefix || defaultApiPrefix;

  return createAiidaRestClient({
    baseUrl,
    apiPrefix,
  });
}

export async function getAiidaRestClient() {
  if (!aiidaRestClientPromise) {
    aiidaRestClientPromise = createClientFromBackendSettings();
  }

  return aiidaRestClientPromise;
}
