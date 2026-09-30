export type CardFields = {
  full_name: string;
  company: string;
  job_title: string;
  phone: string;
  email: string;
  website: string;
};

export interface CardExtractor {
  extract(image: Blob): Promise<{ fields: CardFields; rawText: string }>;
}

export const EMPTY_FIELDS: CardFields = {
  full_name: "",
  company: "",
  job_title: "",
  phone: "",
  email: "",
  website: "",
};
