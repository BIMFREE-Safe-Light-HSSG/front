// api/auth.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const apiUrl = (path: string) => {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return `${API_URL}${path}`;
};

export type UserJob = "FACILITY_MANAGER" | "FIREFIGHTER";

export type Building = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  district_code: string | null;
  district_name: string | null;
  region_1depth_name?: string | null;
  region_2depth_name?: string | null;
  region_3depth_name?: string | null;
};

export type Jurisdiction = {
  code?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  provider?: string;
  provider_place_id?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  job: UserJob;
  jurisdiction: Jurisdiction | null;
  created_at: string;
  building: Building | null;
};

export type LoginResponse = {
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type SignupResponse = {
  message: string;
  user: AuthUser;
};

export type BuildingLocationPayload = {
  latitude: number;
  longitude: number;
  place_name?: string;
  address?: string;
  provider?: string;
  provider_place_id?: string;
  district_code?: string;
  district_name?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

export type SignupPayload = {
  name: string;
  job: UserJob;
  email: string;
  password: string;
  building_location?: BuildingLocationPayload;
  jurisdiction?: {
    code?: string;
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    provider?: string;
    provider_place_id?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  };
};

export const signin = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await axios.post(apiUrl("/auth/login"), {
    email: email,
    password: password
  });

  return response.data;
};

export const signup = async (payload: SignupPayload): Promise<SignupResponse> => {
  const response = await axios.post(apiUrl("/auth/signup"), payload);

  return response.data;
};

export const getMe = async (accessToken: string): Promise<AuthUser> => {
  const response = await axios.get(apiUrl("/auth/me"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};
