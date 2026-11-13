
import { API_BASE_URL } from "./apiConfig";

export interface WorkoutPreferences {
  goal: string;
  level: string;
  location: string;
  daysPerWeek: number;
  duration: number;
  mode: string;
}

export interface SavedWorkout {
  _id: string;
  preferences: WorkoutPreferences;
  plan: unknown[];
  completedExercises: string[];
  createdAt: string;
  updatedAt: string;
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  workout?: T | null;
};

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function fetchWorkout(
  token: string
): Promise<SavedWorkout | null> {
  const data = await request<ApiResponse<SavedWorkout>>(
    "/workouts/me",
    token
  );

  return data.workout ?? null;
}

export async function saveWorkout(
  token: string,
  preferences: WorkoutPreferences,
  plan: unknown[],
  completedExercises: string[] = []
): Promise<SavedWorkout> {
  const data = await request<ApiResponse<SavedWorkout>>(
    "/workouts",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        preferences,
        plan,
        completedExercises,
      }),
    }
  );

  if (!data.workout) {
    throw new Error("The server did not return the saved workout.");
  }

  return data.workout;
}

export async function updateCompletedExercises(
  token: string,
  completedExercises: string[]
): Promise<SavedWorkout> {
  const data = await request<ApiResponse<SavedWorkout>>(
    "/workouts/completed",
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ completedExercises }),
    }
  );

  if (!data.workout) {
    throw new Error("The server did not return the updated workout.");
  }

  return data.workout;
}
