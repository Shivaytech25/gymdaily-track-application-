
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

export interface CustomExerciseItem {
  _id: string;
  name: string;
  muscle: string;
  category?: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  equipment?: string[];
  isCustom?: boolean;
  notes?: string;
}

export async function fetchCustomExercises(
  token: string
): Promise<CustomExerciseItem[]> {
  const data = await request<{ success: boolean; data?: CustomExerciseItem[]; exercises?: CustomExerciseItem[] }>(
    "/workouts/custom-exercises",
    token,
    { method: "GET" }
  );

  return data.data ?? data.exercises ?? [];
}

export async function createCustomExercise(
  token: string,
  exerciseData: {
    name: string;
    muscle: string;
    category?: string;
    sets: number;
    reps: number;
    durationSeconds?: number;
    equipment?: string[];
    notes?: string;
  }
): Promise<CustomExerciseItem> {
  const data = await request<{ success: boolean; exercise?: CustomExerciseItem; data?: CustomExerciseItem }>(
    "/workouts/custom-exercises",
    token,
    {
      method: "POST",
      body: JSON.stringify(exerciseData),
    }
  );

  const created = data.exercise ?? data.data;
  if (!created) {
    throw new Error("Failed to create custom exercise");
  }
  return created;
}

export async function updateCustomExercise(
  token: string,
  id: string,
  exerciseData: Partial<{
    name: string;
    muscle: string;
    category?: string;
    sets: number;
    reps: number;
    durationSeconds?: number;
    equipment?: string[];
    notes?: string;
  }>
): Promise<CustomExerciseItem> {
  const data = await request<{ success: boolean; exercise?: CustomExerciseItem; data?: CustomExerciseItem }>(
    `/workouts/custom-exercises/${id}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(exerciseData),
    }
  );

  const updated = data.exercise ?? data.data;
  if (!updated) {
    throw new Error("Failed to update custom exercise");
  }
  return updated;
}

export async function deleteCustomExercise(
  token: string,
  id: string
): Promise<boolean> {
  const data = await request<{ success: boolean; message?: string }>(
    `/workouts/custom-exercises/${id}`,
    token,
    {
      method: "DELETE",
    }
  );

  return data.success;
}
