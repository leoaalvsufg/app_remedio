export type Sex = 'female' | 'male' | 'intersex' | 'prefer_not_to_say';
export type PregnancyStatus =
  | 'not_applicable'
  | 'possibly_pregnant'
  | 'pregnant'
  | 'breastfeeding'
  | 'unknown';
export type OrganFunction = 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment' | 'unknown';
export type SubstanceUse = 'none' | 'occasional' | 'regular' | 'unknown';

export interface HealthProfile {
  userId: string;
  conditions: string;
  allergies: string;
  additionalNotes: string;
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  sex: Sex | null;
  pregnancy: PregnancyStatus | null;
  kidneyFunction: OrganFunction | null;
  liverFunction: OrganFunction | null;
  alcoholUse: SubstanceUse | null;
  smoking: SubstanceUse | null;
  onboardingCompletedAt: number | null;
  updatedAt: number;
}

export interface HealthProfileInput {
  conditions: string;
  allergies: string;
  additionalNotes: string;
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  sex: Sex | null;
  pregnancy: PregnancyStatus | null;
  kidneyFunction: OrganFunction | null;
  liverFunction: OrganFunction | null;
  alcoholUse: SubstanceUse | null;
  smoking: SubstanceUse | null;
}
