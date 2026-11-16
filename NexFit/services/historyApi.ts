import { API_BASE_URL } from "./apiConfig";

export interface DayActivityItem {
  date: string;
  hasWorkout: boolean;
  hasNutrition: boolean;
  workout: {
    sessionsCount: number;
    status: "not_started" | "in_progress" | "completed";
    durationMinutes: number;
    caloriesBurned: number;
    exercisesCount: number;
    setsCount: number;
    sessions: any[];
  };
  nutrition: {
    consumed: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    targets?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      fiber: number;
    };
    mealsCount: number;
    foodsCount: number;
    meals: any[];
  };
  hydration: {
    consumedMl: number;
    targetMl: number;
  };
}

export interface MonthlyHistoryDay {
  date: string;
  dayNumber: number;
  hasWorkout: boolean;
  hasNutrition: boolean;
  hasWater: boolean;
  active: boolean;
  workout: {
    sessionsCount: number;
    durationMinutes: number;
    caloriesBurned: number;
    status: string;
    sessions: any[];
  };
  nutrition: {
    consumed: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    targets?: any;
    mealsCount: number;
    foodsCount: number;
  };
  hydration: {
    consumedMl: number;
    targetMl: number;
  };
}

export interface MonthlyHistoryResponse {
  year: number;
  month: number;
  monthString: string;
  availableMonths: string[];
  totals: {
    totalDays: number;
    activeDaysCount: number;
    totalWorkoutDays: number;
    totalDurationMinutes: number;
    totalCaloriesBurned: number;
    totalCaloriesConsumed: number;
    averageDailyCalories: number;
  };
  days: MonthlyHistoryDay[];
}

export interface DayHistoryDetail {
  date: string;
  workout: {
    sessionsCount: number;
    sessions: any[];
    totalDurationMinutes: number;
    totalCaloriesBurned: number;
  };
  nutrition: {
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
    meals: any[];
  };
  hydration: {
    consumedMl: number;
    targetMl: number;
    entries: any[];
  };
  measurement?: any;
}

async function request<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Failed to fetch history (${response.status})`);
  }

  return data.data as T;
}

export async function fetchHistoryRange(
  token: string,
  options: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  data: DayActivityItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/history${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Failed to load history list");
  }

  return {
    data: data.data,
    pagination: data.pagination,
  };
}

export async function fetchMonthlyHistory(
  token: string,
  monthOrYear?: string | number,
  monthNum?: number
): Promise<MonthlyHistoryResponse> {
  let query = "";
  if (typeof monthOrYear === "string" && monthOrYear.includes("-")) {
    query = `?month=${encodeURIComponent(monthOrYear)}`;
  } else if (monthOrYear !== undefined && monthNum !== undefined) {
    query = `?year=${encodeURIComponent(monthOrYear)}&month=${encodeURIComponent(monthNum)}`;
  }

  return request<MonthlyHistoryResponse>(`/history/monthly${query}`, token);
}

export async function fetchDayHistory(
  token: string,
  date: string
): Promise<DayHistoryDetail> {
  return request<DayHistoryDetail>(`/history/date/${encodeURIComponent(date)}`, token);
}
