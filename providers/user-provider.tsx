"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/slices/auth-slice";
import type { UserProfile } from "@/types";

/**
 * Hydrates the Redux auth store with server-fetched user data
 * and wraps children. Place in server component layouts that
 * have access to the authenticated user.
 */
export default function UserProvider({
	user,
	children,
}: {
	user: UserProfile;
	children: ReactNode;
}) {
	const dispatch = useAppDispatch();
	const hydrated = useRef(false);

	useEffect(() => {
		if (!hydrated.current) {
			dispatch(setUser(user));
			hydrated.current = true;
		}
	}, [dispatch, user]);

	return <>{children}</>;
}
