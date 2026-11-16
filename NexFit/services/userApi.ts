import { API_BASE_URL } from "./apiConfig";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  gender?: string;
  fitnessGoal: string;
  experienceLevel: string;
  workoutDaysPerWeek: number;
  dietPreference: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  dateOfBirth?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserProfileInput {
  name?: string;
  phoneNumber?: string;
  gender?: string;
  fitnessGoal?: string;
  experienceLevel?: string;
  workoutDaysPerWeek?: number;
  dietPreference?: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  dateOfBirth?: string;
}

export async function fetchUserProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Failed to fetch profile (${response.status})`);
  }

  return data.data;
}

export async function updateUserProfile(
  token: string,
  updates: UpdateUserProfileInput
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Failed to update profile (${response.status})`);
  }

  return data.data;
}
