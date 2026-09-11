export interface LocationDto {
  country: string | null;
  region: string | null;
  city: string | null;
  latFuzzed: number | null;
  lngFuzzed: number | null;
}

export interface UpdateLocationPayload {
  country?: string;
  region?: string;
  city?: string;
}
