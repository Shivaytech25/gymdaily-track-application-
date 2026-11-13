
import { API_BASE_URL } from "./apiConfig";

export interface NutritionFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface NutritionMeal {
  _id?: string;
  name: string;
  time?: string;
  foods: NutritionFood[];
  notes?: string;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface NutritionLog {
  _id?: string;
  userId?: string;
  logDate: string;
  meals: NutritionMeal[];
  dailyTargets: NutritionTargets;
  createdAt?: string;
  updatedAt?: string;
}

export type SaveNutritionInput = Pick<
  NutritionLog,
  "meals" | "dailyTargets"
>;

type ApiResponse<T> = {
  success: boolean;
  message?: string;
} & T;

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

function dateQuery(date: string): string {
  return `?date=${encodeURIComponent(date)}`;
}

/** Get nutrition log for a specific date. */
export async function fetchNutritionLog(
  token: string,
  date: string,
): Promise<NutritionLog | null> {
  const result = await request<
    ApiResponse<{ nutrition?: NutritionLog | null; log?: NutritionLog | null }>
  >(`/nutrition${dateQuery(date)}`, token);

  return result.nutrition ?? result.log ?? null;
}

/** Save or update the complete nutrition log for a date. */
export async function saveNutritionLog(
  token: string,
  date: string,
  input: SaveNutritionInput,
): Promise<NutritionLog> {
  const result = await request<
    ApiResponse<{ nutrition?: NutritionLog; log?: NutritionLog }>
  >(`/nutrition${dateQuery(date)}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });

  const nutrition = result.nutrition ?? result.log;

  if (!nutrition) {
    throw new Error("The server did not return the saved nutrition log.");
  }

  return nutrition;
}

/** Add a meal to a day's nutrition log. */
export async function addNutritionMeal(
  token: string,
  date: string,
  meal: NutritionMeal,
): Promise<NutritionLog> {
  const result = await request<
    ApiResponse<{ nutrition?: NutritionLog; log?: NutritionLog }>
  >(`/nutrition/meal${dateQuery(date)}`, token, {
    method: "POST",
    body: JSON.stringify(meal),
  });

  const nutrition = result.nutrition ?? result.log;

  if (!nutrition) {
    throw new Error("The server did not return the updated nutrition log.");
  }

  return nutrition;
}

/** Update a meal by its ID. */
export async function updateNutritionMeal(
  token: string,
  date: string,
  mealId: string,
  updates: Partial<NutritionMeal>,
): Promise<NutritionLog> {
  const result = await request<
    ApiResponse<{ nutrition?: NutritionLog; log?: NutritionLog }>
  >(
    `/nutrition/meal/${encodeURIComponent(mealId)}${dateQuery(date)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );

  const nutrition = result.nutrition ?? result.log;

  if (!nutrition) {
    throw new Error("The server did not return the updated nutrition log.");
  }

  return nutrition;
}

/** Delete a meal by its ID. */
export async function deleteNutritionMeal(
  token: string,
  date: string,
  mealId: string,
): Promise<void> {
  await request<ApiResponse<{ nutrition?: NutritionLog; log?: NutritionLog }>>(
    `/nutrition/meal/${encodeURIComponent(mealId)}${dateQuery(date)}`,
    token,
    { method: "DELETE" },
  );
}
