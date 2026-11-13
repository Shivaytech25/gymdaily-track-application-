
import { API_BASE_URL } from "./apiConfig";

export interface WorkoutHistorySession {
  _id: string;
  date?: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  caloriesBurned?: number;
  exercises?: unknown[];
  [key: string]: unknown;
}

export interface WorkoutHistoryResponse {
  success: boolean;
  message?: string;
  data?: WorkoutHistorySession[] | {
    sessions?: WorkoutHistorySession[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  sessions?: WorkoutHistorySession[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface WorkoutCalendarDay {
  date: string;
  sessionCount: number;
  durationMinutes: number;
  caloriesBurned: number;
}

export interface WorkoutCalendarResponse {
  success: boolean;
  message?: string;
  data?: {
    month: string;
    workoutDays: WorkoutCalendarDay[];
    totalSessions: number;
    totalWorkoutDays: number;
  };
  month?: string;
  workoutDays?: WorkoutCalendarDay[];
  totalSessions?: number;
  totalWorkoutDays?: number;
}

async function request<T>(
  endpoint: string,
  token: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to fetch workout history"
    );
  }

  return result as T;
}

/** Fetch workout history with optional date range and pagination. */
export async function fetchWorkoutHistory(
  token: string,
  options: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<WorkoutHistoryResponse> {
  const params = new URLSearchParams();

  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.page !== undefined) {
    params.set("page", String(options.page));
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  const query = params.toString();

  return request<WorkoutHistoryResponse>(
    `/workout-history${query ? `?${query}` : ""}`,
    token
  );
}

/** Fetch workout calendar for a month formatted as YYYY-MM. */
export async function fetchWorkoutCalendar(
  token: string,
  month: string
): Promise<WorkoutCalendarResponse> {
  return request<WorkoutCalendarResponse>(
    `/workout-history/calendar?month=${encodeURIComponent(month)}`,
    token
  );
}

/** Fetch workout sessions for a date formatted as YYYY-MM-DD. */
export async function fetchWorkoutHistoryByDate(
  token: string,
  date: string
): Promise<WorkoutHistoryResponse> {
  return request<WorkoutHistoryResponse>(
    `/workout-history/date/${encodeURIComponent(date)}`,
    token
  );
}
