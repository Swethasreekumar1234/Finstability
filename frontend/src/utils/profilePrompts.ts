import { BackendProfile } from '../services/apiService';

export type PromptOption = { label: string; value: string | boolean | number };

export type PromptQuestion = {
  key:
    | 'age'
    | 'gender'
    | 'caste_category'
    | 'minority_status'
    | 'disability_status'
    | 'disability_percentage'
    | 'marital_status'
    | 'district'
    | 'urban_rural'
    | 'domicile_years'
    | 'aspirational_district'
    | 'special_region_flag'
    | 'household_size'
    | 'dependent_children'
    | 'senior_citizens_in_household'
    | 'single_woman_led_household'
    | 'occupation_subtype'
    | 'sector'
    | 'employment_proof_available'
    | 'education_level'
    | 'student_status'
    | 'institution_type'
    | 'course_stream'
    | 'has_bank_account'
    | 'jan_dhan_account'
    | 'has_aadhaar'
    | 'has_pan'
    | 'landholding_acres'
    | 'irrigation_status'
    | 'housing_ownership_type'
    | 'pmay_eligible'
    | 'has_life_insurance'
    | 'has_health_insurance'
    | 'enrolled_pmjjby'
    | 'enrolled_pmsby'
    | 'enrolled_apy'
    | 'enrolled_esic'
    | 'enrolled_epfo'
    | 'application_history_status'
    | 'benefit_cap_reached'
    | 'has_ration_card'
    | 'has_caste_certificate'
    | 'has_disability_certificate'
    | 'has_income_certificate'
    | 'has_domicile_certificate'
    | 'has_bank_passbook'
    | 'has_land';
  title: string;
  subtitle: string;
  options: PromptOption[];
};

const YES_NO_OPTIONS: PromptOption[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const BOOLEAN_KEYS = new Set<string>([
  'minority_status',
  'disability_status',
  'aspirational_district',
  'special_region_flag',
  'single_woman_led_household',
  'employment_proof_available',
  'has_bank_account',
  'jan_dhan_account',
  'has_aadhaar',
  'has_pan',
  'pmay_eligible',
  'has_life_insurance',
  'has_health_insurance',
  'enrolled_pmjjby',
  'enrolled_pmsby',
  'enrolled_apy',
  'enrolled_esic',
  'enrolled_epfo',
  'benefit_cap_reached',
  'has_ration_card',
  'has_caste_certificate',
  'has_disability_certificate',
  'has_income_certificate',
  'has_domicile_certificate',
  'has_bank_passbook',
  'has_land',
]);

const NUMBER_KEYS = new Set<string>([
  'age',
  'disability_percentage',
  'domicile_years',
  'household_size',
  'dependent_children',
  'senior_citizens_in_household',
  'landholding_acres',
]);

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && !v.trim());

export function nextProfilePrompt(profile: BackendProfile | null): PromptQuestion | null {
  if (!profile) return null;

  if (profile.age_confirmed !== true || !profile.age) {
    return {
      key: 'age',
      title: 'Your age',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: '18-24', value: 22 },
        { label: '25-34', value: 30 },
        { label: '35-44', value: 39 },
        { label: '45-54', value: 49 },
        { label: '55+', value: 58 },
      ],
    };
  }

  if (!profile.gender || String(profile.gender).toLowerCase() === 'other') {
    return {
      key: 'gender',
      title: 'Your gender',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
        { label: 'Other', value: 'other' },
      ],
    };
  }

  if (!profile.caste_category) {
    return {
      key: 'caste_category',
      title: 'Your category',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'General', value: 'general' },
        { label: 'OBC', value: 'obc' },
        { label: 'SC', value: 'sc' },
        { label: 'ST', value: 'st' },
      ],
    };
  }

  if (typeof (profile as any).minority_status !== 'boolean') {
    return {
      key: 'minority_status',
      title: 'Do you belong to a minority community?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).disability_status !== 'boolean') {
    return {
      key: 'disability_status',
      title: 'Do you have a certified disability?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if ((profile as any).disability_status === true && !Number.isFinite(Number((profile as any).disability_percentage))) {
    return {
      key: 'disability_percentage',
      title: 'Select your disability percentage range',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Below 40%', value: 30 },
        { label: '40-59%', value: 50 },
        { label: '60-79%', value: 70 },
        { label: '80%+', value: 85 },
      ],
    };
  }

  if (isBlank((profile as any).marital_status)) {
    return {
      key: 'marital_status',
      title: 'What is your marital status?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Married', value: 'married' },
        { label: 'Widowed', value: 'widowed' },
        { label: 'Divorced/Separated', value: 'divorced_or_separated' },
      ],
    };
  }

  if (isBlank((profile as any).district)) {
    return {
      key: 'district',
      title: 'Your district type',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Metro district', value: 'metro' },
        { label: 'Urban district', value: 'urban_district' },
        { label: 'Semi-urban district', value: 'semi_urban_district' },
        { label: 'Rural district', value: 'rural_district' },
      ],
    };
  }

  if (isBlank((profile as any).urban_rural)) {
    return {
      key: 'urban_rural',
      title: 'Do you live in urban or rural area?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Urban', value: 'urban' },
        { label: 'Rural', value: 'rural' },
      ],
    };
  }

  if (!Number.isFinite(Number((profile as any).domicile_years))) {
    return {
      key: 'domicile_years',
      title: 'Years in this state',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Less than 1 year', value: 0 },
        { label: '1-3 years', value: 2 },
        { label: '4-7 years', value: 5 },
        { label: '8+ years', value: 10 },
      ],
    };
  }

  if (typeof (profile as any).aspirational_district !== 'boolean') {
    return {
      key: 'aspirational_district',
      title: 'Do you live in an aspirational district?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).special_region_flag !== 'boolean') {
    return {
      key: 'special_region_flag',
      title: 'Do you belong to a notified special region?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (!Number.isFinite(Number((profile as any).household_size))) {
    return {
      key: 'household_size',
      title: 'How many people are in your household?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: '1', value: 1 },
        { label: '2-3', value: 3 },
        { label: '4-5', value: 5 },
        { label: '6+', value: 6 },
      ],
    };
  }

  if (!Number.isFinite(Number((profile as any).dependent_children))) {
    return {
      key: 'dependent_children',
      title: 'How many dependent children are there?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: '0', value: 0 },
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3+', value: 3 },
      ],
    };
  }

  if (!Number.isFinite(Number((profile as any).senior_citizens_in_household))) {
    return {
      key: 'senior_citizens_in_household',
      title: 'Any senior citizens in your household?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'None', value: 0 },
        { label: '1', value: 1 },
        { label: '2+', value: 2 },
      ],
    };
  }

  if (typeof (profile as any).single_woman_led_household !== 'boolean') {
    return {
      key: 'single_woman_led_household',
      title: 'Is your household single-woman led?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (isBlank((profile as any).occupation_subtype)) {
    return {
      key: 'occupation_subtype',
      title: 'Your work type',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Farmer', value: 'farmer' },
        { label: 'Gig worker', value: 'gig_worker' },
        { label: 'Artisan', value: 'artisan' },
        { label: 'MSME owner', value: 'msme_owner' },
        { label: 'Unemployed', value: 'unemployed' },
        { label: 'Student', value: 'student' },
        { label: 'Other (type your own)', value: '__other__' },
      ],
    };
  }

  if (isBlank((profile as any).sector)) {
    return {
      key: 'sector',
      title: 'Your work sector',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Agriculture', value: 'agri' },
        { label: 'Informal', value: 'informal' },
        { label: 'Services', value: 'services' },
        { label: 'Manufacturing', value: 'manufacturing' },
      ],
    };
  }

  if (typeof (profile as any).employment_proof_available !== 'boolean') {
    return {
      key: 'employment_proof_available',
      title: 'Do you have employment proof documents?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (isBlank((profile as any).education_level)) {
    return {
      key: 'education_level',
      title: 'What is your highest education level?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'School', value: 'school' },
        { label: 'Diploma', value: 'diploma' },
        { label: 'Undergraduate', value: 'undergraduate' },
        { label: 'Postgraduate+', value: 'postgraduate' },
      ],
    };
  }

  if (isBlank((profile as any).student_status)) {
    return {
      key: 'student_status',
      title: 'What is your student status?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Not a student', value: 'not_student' },
        { label: 'School student', value: 'school_student' },
        { label: 'College student', value: 'college_student' },
        { label: 'Vocational trainee', value: 'vocational_trainee' },
      ],
    };
  }

  if ((profile as any).student_status && (profile as any).student_status !== 'not_student' && isBlank((profile as any).institution_type)) {
    return {
      key: 'institution_type',
      title: 'What type of institution do you attend?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Government', value: 'government' },
        { label: 'Government-aided', value: 'government_aided' },
        { label: 'Private', value: 'private' },
      ],
    };
  }

  if ((profile as any).student_status && (profile as any).student_status !== 'not_student' && isBlank((profile as any).course_stream)) {
    return {
      key: 'course_stream',
      title: 'Which course stream are you in?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'General', value: 'general' },
        { label: 'STEM', value: 'stem' },
        { label: 'Vocational', value: 'vocational' },
        { label: 'Professional', value: 'professional' },
      ],
    };
  }

  if (typeof profile.has_health_insurance !== 'boolean') {
    return {
      key: 'has_health_insurance',
      title: 'Do you currently have health insurance?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof profile.has_life_insurance !== 'boolean') {
    return {
      key: 'has_life_insurance',
      title: 'Do you currently have life insurance?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof profile.has_bank_account !== 'boolean') {
    return {
      key: 'has_bank_account',
      title: 'Do you have a bank account?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).jan_dhan_account !== 'boolean') {
    return {
      key: 'jan_dhan_account',
      title: 'Do you have a Jan Dhan account?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_aadhaar !== 'boolean') {
    return {
      key: 'has_aadhaar',
      title: 'Do you have Aadhaar?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_pan !== 'boolean') {
    return {
      key: 'has_pan',
      title: 'Do you have PAN?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof profile.has_land !== 'boolean') {
    return {
      key: 'has_land',
      title: 'Do you own farm land?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if ((profile as any).has_land === true && !Number.isFinite(Number((profile as any).landholding_acres))) {
    return {
      key: 'landholding_acres',
      title: 'Select your landholding size',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Up to 1 acre', value: 1 },
        { label: '1-2 acres', value: 2 },
        { label: '2-5 acres', value: 5 },
        { label: '5+ acres', value: 6 },
      ],
    };
  }

  if ((profile as any).has_land === true && isBlank((profile as any).irrigation_status)) {
    return {
      key: 'irrigation_status',
      title: 'What is your irrigation status?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Irrigated', value: 'irrigated' },
        { label: 'Rainfed', value: 'rainfed' },
        { label: 'Mixed', value: 'mixed' },
      ],
    };
  }

  if (isBlank((profile as any).housing_ownership_type)) {
    return {
      key: 'housing_ownership_type',
      title: 'What is your housing ownership type?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Owned', value: 'owned' },
        { label: 'Rented', value: 'rented' },
        { label: 'Living with family', value: 'living_with_family' },
        { label: 'Other', value: 'other' },
      ],
    };
  }

  if (typeof (profile as any).pmay_eligible !== 'boolean') {
    return {
      key: 'pmay_eligible',
      title: 'Do you believe you are PMAY-eligible?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).enrolled_pmjjby !== 'boolean') {
    return {
      key: 'enrolled_pmjjby',
      title: 'Are you enrolled in PMJJBY?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).enrolled_pmsby !== 'boolean') {
    return {
      key: 'enrolled_pmsby',
      title: 'Are you enrolled in PMSBY?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).enrolled_apy !== 'boolean') {
    return {
      key: 'enrolled_apy',
      title: 'Are you enrolled in APY?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).enrolled_esic !== 'boolean') {
    return {
      key: 'enrolled_esic',
      title: 'Are you enrolled in ESIC?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).enrolled_epfo !== 'boolean') {
    return {
      key: 'enrolled_epfo',
      title: 'Are you enrolled in EPFO?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (isBlank((profile as any).application_history_status)) {
    return {
      key: 'application_history_status',
      title: 'What is your recent scheme application history?',
      subtitle: 'Helps us match the right schemes.',
      options: [
        { label: 'Never applied', value: 'never_applied' },
        { label: 'Applied - pending', value: 'applied_pending' },
        { label: 'Previously approved', value: 'previously_approved' },
        { label: 'Previously rejected', value: 'previously_rejected' },
      ],
    };
  }

  if (typeof (profile as any).benefit_cap_reached !== 'boolean') {
    return {
      key: 'benefit_cap_reached',
      title: 'Have you reached any capped subsidy limit recently?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_ration_card !== 'boolean') {
    return {
      key: 'has_ration_card',
      title: 'Do you have a ration card?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_caste_certificate !== 'boolean') {
    return {
      key: 'has_caste_certificate',
      title: 'Do you have a caste certificate (if applicable)?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if ((profile as any).disability_status === true && typeof (profile as any).has_disability_certificate !== 'boolean') {
    return {
      key: 'has_disability_certificate',
      title: 'Do you have a disability certificate?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_income_certificate !== 'boolean') {
    return {
      key: 'has_income_certificate',
      title: 'Do you have an income certificate?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_domicile_certificate !== 'boolean') {
    return {
      key: 'has_domicile_certificate',
      title: 'Do you have a domicile certificate?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  if (typeof (profile as any).has_bank_passbook !== 'boolean') {
    return {
      key: 'has_bank_passbook',
      title: 'Do you have a bank passbook copy?',
      subtitle: 'Helps us match the right schemes.',
      options: YES_NO_OPTIONS,
    };
  }

  return null;
}

export function applyPromptAnswerToPayload(payload: BackendProfile, prompt: PromptQuestion, value: string | boolean | number): void {
  const key = prompt.key;

  if (key === 'age') {
    const numericAge = Number(value);
    payload.age = Number.isFinite(numericAge) ? numericAge : undefined;
    payload.age_confirmed = true;
    payload.age_band = numericAge <= 24 ? '18-24'
      : numericAge <= 34 ? '25-34'
        : numericAge <= 44 ? '35-44'
          : numericAge <= 54 ? '45-54'
            : '55+';
    return;
  }

  if (BOOLEAN_KEYS.has(key)) {
    (payload as any)[key] = Boolean(value);
    if (key === 'disability_status' && value === false) {
      (payload as any).disability_percentage = undefined;
      (payload as any).has_disability_certificate = undefined;
    }
    return;
  }

  if (NUMBER_KEYS.has(key)) {
    const n = Number(value);
    (payload as any)[key] = Number.isFinite(n) ? n : undefined;
    return;
  }

  (payload as any)[key] = String(value).toLowerCase();
}