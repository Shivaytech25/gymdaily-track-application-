
import { API_BASE_URL } from "./apiConfig";

export interface WaterEntry {
  _id: string;
  amountMl: number;
  consumedAt: string;
  note?: string;
}

export interface WaterLog {
  _id?: string;
  logDate: string;
  entries: WaterEntry[];
  dailyTargetMl: number;
  totalConsumedMl: number;
  remainingMl: number;
  progressPercentage: number;
}

interface WaterApiResponse {
  success: boolean;
  message?: string;
  data?: WaterLog;
  waterLog?: WaterLog;
  log?: WaterLog;
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Water API request failed");
  }

  return result as T;
}

function getLogFromResponse(result: WaterApiResponse): WaterLog | null {
  return result.data ?? result.waterLog ?? result.log ?? null;
}

/** Fetch water intake for a date (YYYY-MM-DD). */
export async function fetchWaterLog(
  token: string,
  date: string
): Promise<WaterLog | null> {
  const result = await request<WaterApiResponse>(
    `/water?date=${encodeURIComponent(date)}`,
    token
  );

  return getLogFromResponse(result);
}

/** Add a water intake entry. */
export async function addWaterEntry(
  token: string,
  date: string,
  amountMl: number,
  note?: string
): Promise<WaterLog | null> {
  const result = await request<WaterApiResponse>(
    `/water/entries?date=${encodeURIComponent(date)}`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ amountMl, ...(note ? { note } : {}) }),
    }
  );

  return getLogFromResponse(result);
}

/** Update the daily water target in millilitres. */
export async function updateWaterTarget(
  token: string,
  date: string,
  dailyTargetMl: number
): Promise<WaterLog | null> {
  const result = await request<WaterApiResponse>(
    `/water/target?date=${encodeURIComponent(date)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ dailyTargetMl }),
    }
  );

  return getLogFromResponse(result);
}

/** Delete a water entry by its ID. */
export async function deleteWaterEntry(
  token: string,
  date: string,
  entryId: string
): Promise<WaterLog | null> {
  const result = await request<WaterApiResponse>(
    `/water/entries/${encodeURIComponent(entryId)}?date=${encodeURIComponent(date)}`,
    token,
    { method: "DELETE" }
  );

  return getLogFromResponse(result);
}
