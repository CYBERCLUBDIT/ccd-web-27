export type ClubContent = {
  id: string;
  kind: string;
  title: string;
  description: string;
  body: string;
  category: string;
  image_url: string;
  external_url: string;
  event_date: string | null;
  location: string;
  published: boolean;
};
export type ClubUser = {
  id: string;
  name: string;
  email: string;
  registration_number: string;
  phone: string;
  course: string;

  role: string;
  status: string;
};
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(value));
}
