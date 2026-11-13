
import { API_BASE_URL } from "./apiConfig";

export interface DashboardWorkout {
  sessions: number;
  durationMinutes: number;
  caloriesBurned: number;
  completedSets: number;
  items?: unknown[];
}

export interface DashboardNutrition {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface DashboardHydration {
  consumedMl: number;
  targetMl: number;
  remainingMl: number;
  progressPercentage: number;
}

export interface DashboardBody {
  latestMeasurement: {
    weightKg: number;
    bodyFatPercentage?: number;
    measuredAt?: string;
  } | null;
}

export interface WeeklyActivity {
  date: string;
  sessions: number;
  durationMinutes: number;
  caloriesBurned: number;
}

export interface DashboardData {
  date: string;
  workout: DashboardWorkout;
  nutrition: DashboardNutrition;
  hydration: DashboardHydration;
  body: DashboardBody;
  weeklyActivity: WeeklyActivity[];
}

interface DashboardApiResponse {
  success: boolean;
  message?: string;
  data?: DashboardData;
  dashboard?: DashboardData;
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
    throw new Error(result.message || "Failed to fetch dashboard");
  }

  return result as T;
}

/** Fetch dashboard data for today or a specific date (YYYY-MM-DD). */
export async function fetchDashboard(
  token: string,
  date?: string
): Promise<DashboardData> {
  const endpoint = date
    ? `/dashboard?date=${encodeURIComponent(date)}`
    : "/dashboard";

  const result = await request<DashboardApiResponse>(
    endpoint,
    token
  );

  const dashboard = result.data ?? result.dashboard;

  if (!dashboard) {
    throw new Error("Dashboard data was not returned by the server");
  }

  return dashboard;
}
