
import { API_BASE_URL } from "./apiConfig";

export type AchievementCategory =
  | "workout"
  | "streak"
  | "strength"
  | "nutrition"
  | "hydration";

export interface UserAchievement {
  _id?: string;
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface AchievementStats {
  total?: number;
  unlocked?: number;
  locked?: number;
  completionPercentage?: number;
  [key: string]: unknown;
}

interface AchievementApiResponse {
  success: boolean;
  message?: string;
  data?: UserAchievement[] | AchievementStats | {
    achievements?: UserAchievement[];
    stats?: AchievementStats;
  };
  achievements?: UserAchievement[];
  stats?: AchievementStats;
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
      result.message || "Failed to fetch achievements"
    );
  }

  return result as T;
}

/** Fetch all achievements. */
export async function fetchAchievements(
  token: string
): Promise<AchievementApiResponse> {
  return request<AchievementApiResponse>("/achievements", token);
}

/** Fetch achievements dashboard data. */
export async function fetchAchievementDashboard(
  token: string
): Promise<AchievementApiResponse> {
  return request<AchievementApiResponse>(
    "/achievements/dashboard",
    token
  );
}

/** Fetch achievement statistics. */
export async function fetchAchievementStats(
  token: string
): Promise<AchievementApiResponse> {
  return request<AchievementApiResponse>(
    "/achievements/stats",
    token
  );
}
