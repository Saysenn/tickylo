"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";

interface OrgSettings {
	attachments_enabled: boolean;
	departments_enabled: boolean;
	plan: string;
	is_internal: boolean;
}

const OrgSettingsContext = createContext<OrgSettings>({
	attachments_enabled: true,
	departments_enabled: true,
	plan: "business",
	is_internal: false,
});

export function useOrgSettings() {
	return useContext(OrgSettingsContext);
}

export function usePlan() {
	const { plan, is_internal } = useOrgSettings();
	return { plan, is_internal };
}

export function OrgSettingsProvider({ children }: { children: ReactNode }) {
	const { data } = useQuery<OrgSettings>({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 60_000,
	});

	const value: OrgSettings = data ?? {
		attachments_enabled: true,
		departments_enabled: true,
		plan: "business",
		is_internal: false,
	};

	return (
		<OrgSettingsContext.Provider value={value}>
			{children}
		</OrgSettingsContext.Provider>
	);
}
