"use client";

import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export function PageTour({ tourKey, steps }: { tourKey: string; steps: DriveStep[] }) {
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		const storageKey = "tw_page_" + tourKey;
		if (localStorage.getItem(storageKey)) return;

		started.current = true;

		const t = setTimeout(() => {
			const driverObj = driver({
				showProgress:   true,
				animate:        true,
				overlayColor:   "#000",
				overlayOpacity: 0.4,
				smoothScroll:   true,
				allowClose:     true,
				progressText:   "{{current}} of {{total}}",
				nextBtnText:    "Next →",
				prevBtnText:    "← Back",
				doneBtnText:    "Done",
				steps,
				onDestroyStarted: () => {
					driverObj.destroy();
					localStorage.setItem(storageKey, "1");
				},
			});
			driverObj.drive();
		}, 800);

		return () => clearTimeout(t);
	}, [tourKey, steps]);

	return null;
}
