"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";

interface OrgSettings {
	attachments_enabled: boolean;
}

const OrgSettingsContext = createContext<OrgSettings>({ attachments_enabled: true });

export function useOrgSettings() {
	return useContext(OrgSettingsContext);
}

export function OrgSettingsProvider({ children }: { children: ReactNode }) {
	const { data } = useQuery<OrgSettings>({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 60_000,
	});

	const value: OrgSettings = data ?? { attachments_enabled: true };

	return (
		<OrgSettingsContext.Provider value={value}>
			{children}
		</OrgSettingsContext.Provider>
	);
}
