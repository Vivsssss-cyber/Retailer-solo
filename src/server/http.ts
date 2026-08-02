import { NextResponse } from "next/server";
import { ApiError, isApiError } from "./errors";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status ?? 200 });
}

export function jsonError(err: unknown) {
  if (isApiError(err)) {
    return NextResponse.json(err.toJSON(), { status: err.status });
  }
  console.error("[retailer-challenge api]", err);
  const fallback = new ApiError("INTERNAL", "Internal server error");
  return NextResponse.json(fallback.toJSON(), { status: 500 });
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("BAD_REQUEST", "Invalid JSON body");
  }
}
