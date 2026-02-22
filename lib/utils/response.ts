import { NextResponse } from "next/server";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json(data, { status });

export const created = <T>(data: T) =>
  NextResponse.json(data, { status: 201 });

export const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
