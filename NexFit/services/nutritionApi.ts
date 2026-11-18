
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

/** Update a specific food item in a meal. */
export async function updateNutritionFoodItem(
  token: string,
  date: string,
  mealId: string,
  foodId: string,
  foodUpdates: Partial<NutritionFood>
): Promise<NutritionLog> {
  const result = await request<ApiResponse<{ log: NutritionLog }>>(
    `/nutrition/meal/${encodeURIComponent(mealId)}/food/${encodeURIComponent(foodId)}${dateQuery(date)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(foodUpdates),
    }
  );
  return result.log;
}

/** Fetch historical nutrition logs. */
export async function fetchNutritionHistory(
  token: string,
  options: { from?: string; to?: string; month?: string; page?: number; limit?: number } = {}
): Promise<{ data: any[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.month) params.set("month", options.month);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{ success: boolean; data: any[]; pagination: any }>(
    `/nutrition/history${query}`,
    token
  );
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

export interface CustomFoodItem {
  _id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  servingSize: number;
  servingUnit: string;
  isCustom?: boolean;
}

/** Fetch user's custom food items. */
export async function fetchCustomFoods(token: string): Promise<CustomFoodItem[]> {
  const result = await request<{ success: boolean; data?: CustomFoodItem[]; foods?: CustomFoodItem[] }>(
    "/nutrition/custom-foods",
    token,
    { method: "GET" }
  );

  return result.data ?? result.foods ?? [];
}

/** Create a new custom food item. */
export async function createCustomFood(
  token: string,
  food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    servingSize: number;
    servingUnit: string;
  }
): Promise<CustomFoodItem> {
  const result = await request<{ success: boolean; food?: CustomFoodItem; data?: CustomFoodItem }>(
    "/nutrition/custom-foods",
    token,
    {
      method: "POST",
      body: JSON.stringify(food),
    }
  );

  const created = result.food ?? result.data;
  if (!created) {
    throw new Error("Failed to create custom food");
  }
  return created;
}

/** Update an existing custom food item. */
export async function updateCustomFood(
  token: string,
  id: string,
  food: Partial<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    servingSize: number;
    servingUnit: string;
  }>
): Promise<CustomFoodItem> {
  const result = await request<{ success: boolean; food?: CustomFoodItem; data?: CustomFoodItem }>(
    `/nutrition/custom-foods/${encodeURIComponent(id)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(food),
    }
  );

  const updated = result.food ?? result.data;
  if (!updated) {
    throw new Error("Failed to update custom food");
  }
  return updated;
}

/** Delete a custom food item. */
export async function deleteCustomFood(
  token: string,
  id: string
): Promise<boolean> {
  const result = await request<{ success: boolean; message?: string }>(
    `/nutrition/custom-foods/${encodeURIComponent(id)}`,
    token,
    {
      method: "DELETE",
    }
  );

  return result.success;
}

/** Get personalized nutrition targets. */
export async function fetchNutritionTargets(token: string): Promise<NutritionTargets> {
  const result = await request<{ success: boolean; targets?: NutritionTargets; data?: NutritionTargets }>(
    "/nutrition/targets",
    token,
    { method: "GET" }
  );

  return (
    result.targets ??
    result.data ?? {
      calories: 2000,
      protein: 100,
      carbs: 250,
      fats: 65,
      fiber: 25,
    }
  );
}

/** Update personalized nutrition targets. */
export async function updateNutritionTargets(
  token: string,
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  },
  date?: string
): Promise<NutritionTargets> {
  const result = await request<{ success: boolean; targets?: NutritionTargets; data?: NutritionTargets }>(
    "/nutrition/targets",
    token,
    {
      method: "PUT",
      body: JSON.stringify({ ...targets, date }),
    }
  );

  const updated = result.targets ?? result.data;
  if (!updated) {
    throw new Error("Failed to update nutrition targets");
  }
  return updated;
}
