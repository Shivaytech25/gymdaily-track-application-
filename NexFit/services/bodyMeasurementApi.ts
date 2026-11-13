
import { API_BASE_URL } from "./apiConfig";

export interface BodyMeasurement {
  _id: string;
  userId?: string;
  measuredAt: string;
  weightKg: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBodyMeasurementInput {
  measuredAt?: string;
  weightKg: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  notes?: string;
}

export type UpdateBodyMeasurementInput = Partial<CreateBodyMeasurementInput>;

interface BodyMeasurementApiResponse {
  success: boolean;
  message?: string;
  data?: BodyMeasurement | BodyMeasurement[] | {
    measurements?: BodyMeasurement[];
    measurement?: BodyMeasurement;
    total?: number;
    page?: number;
    limit?: number;
  };
  measurement?: BodyMeasurement;
  measurements?: BodyMeasurement[];
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
    throw new Error(
      result.message || "Body measurement API request failed"
    );
  }

  return result as T;
}

/** Save a new body measurement. */
export async function createBodyMeasurement(
  token: string,
  input: CreateBodyMeasurementInput
): Promise<BodyMeasurement> {
  const result = await request<BodyMeasurementApiResponse>(
    "/body-measurements",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const measurement =
    result.measurement ??
    (result.data && !Array.isArray(result.data) &&
    "weightKg" in result.data
      ? result.data
      : null);

  if (!measurement) {
    throw new Error("Measurement was saved, but no measurement was returned");
  }

  return measurement;
}

/** Fetch paginated body measurement history. */
export async function fetchBodyMeasurements(
  token: string,
  limit = 30,
  page = 1
): Promise<BodyMeasurementApiResponse> {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });

  return request<BodyMeasurementApiResponse>(
    `/body-measurements?${query.toString()}`,
    token
  );
}

/** Fetch the latest body measurement. */
export async function fetchLatestBodyMeasurement(
  token: string
): Promise<BodyMeasurement | null> {
  const result = await request<BodyMeasurementApiResponse>(
    "/body-measurements/latest",
    token
  );

  if (result.measurement) return result.measurement;

  if (
    result.data &&
    !Array.isArray(result.data) &&
    "weightKg" in result.data
  ) {
    return result.data;
  }

  return null;
}

/** Update an existing measurement. */
export async function updateBodyMeasurement(
  token: string,
  measurementId: string,
  updates: UpdateBodyMeasurementInput
): Promise<BodyMeasurement | null> {
  const result = await request<BodyMeasurementApiResponse>(
    `/body-measurements/${encodeURIComponent(measurementId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );

  if (result.measurement) return result.measurement;

  if (
    result.data &&
    !Array.isArray(result.data) &&
    "weightKg" in result.data
  ) {
    return result.data;
  }

  return null;
}

/** Delete a measurement by ID. */
export async function deleteBodyMeasurement(
  token: string,
  measurementId: string
): Promise<void> {
  await request<BodyMeasurementApiResponse>(
    `/body-measurements/${encodeURIComponent(measurementId)}`,
    token,
    { method: "DELETE" }
  );
}
