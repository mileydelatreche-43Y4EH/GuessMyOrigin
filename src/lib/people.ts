import type { Person } from "./types";

/** Portraits + pays d'origine (jeu party — coordonnées capitales / centres) */
export const PEOPLE: Person[] = [
  { id: "1", name: "Amina", country: "Maroc", city: "Casablanca", lat: 33.5731, lng: -7.5898, imageUrl: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: "2", name: "Kenji", country: "Japon", city: "Tokyo", lat: 35.6762, lng: 139.6503, imageUrl: "https://randomuser.me/api/portraits/men/22.jpg" },
  { id: "3", name: "Sofia", country: "Brésil", city: "São Paulo", lat: -23.5505, lng: -46.6333, imageUrl: "https://randomuser.me/api/portraits/women/68.jpg" },
  { id: "4", name: "Lars", country: "Suède", city: "Stockholm", lat: 59.3293, lng: 18.0686, imageUrl: "https://randomuser.me/api/portraits/men/11.jpg" },
  { id: "5", name: "Priya", country: "Inde", city: "Mumbai", lat: 19.076, lng: 72.8777, imageUrl: "https://randomuser.me/api/portraits/women/90.jpg" },
  { id: "6", name: "Omar", country: "Égypte", city: "Le Caire", lat: 30.0444, lng: 31.2357, imageUrl: "https://randomuser.me/api/portraits/men/36.jpg" },
  { id: "7", name: "Chloe", country: "Australie", city: "Sydney", lat: -33.8688, lng: 151.2093, imageUrl: "https://randomuser.me/api/portraits/women/21.jpg" },
  { id: "8", name: "Wei", country: "Chine", city: "Pékin", lat: 39.9042, lng: 116.4074, imageUrl: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "9", name: "Elena", country: "Russie", city: "Moscou", lat: 55.7558, lng: 37.6173, imageUrl: "https://randomuser.me/api/portraits/women/33.jpg" },
  { id: "10", name: "Diego", country: "Mexique", city: "Mexico", lat: 19.4326, lng: -99.1332, imageUrl: "https://randomuser.me/api/portraits/men/55.jpg" },
  { id: "11", name: "Fatou", country: "Sénégal", city: "Dakar", lat: 14.7167, lng: -17.4677, imageUrl: "https://randomuser.me/api/portraits/women/17.jpg" },
  { id: "12", name: "Hans", country: "Allemagne", city: "Berlin", lat: 52.52, lng: 13.405, imageUrl: "https://randomuser.me/api/portraits/men/41.jpg" },
  { id: "13", name: "Yuki", country: "Corée du Sud", city: "Séoul", lat: 37.5665, lng: 126.978, imageUrl: "https://randomuser.me/api/portraits/women/57.jpg" },
  { id: "14", name: "Marcus", country: "États-Unis", city: "New York", lat: 40.7128, lng: -74.006, imageUrl: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "15", name: "Giulia", country: "Italie", city: "Rome", lat: 41.9028, lng: 12.4964, imageUrl: "https://randomuser.me/api/portraits/women/12.jpg" },
  { id: "16", name: "Thabo", country: "Afrique du Sud", city: "Johannesburg", lat: -26.2041, lng: 28.0473, imageUrl: "https://randomuser.me/api/portraits/men/86.jpg" },
  { id: "17", name: "Inès", country: "France", city: "Paris", lat: 48.8566, lng: 2.3522, imageUrl: "https://randomuser.me/api/portraits/women/29.jpg" },
  { id: "18", name: "Carlos", country: "Espagne", city: "Madrid", lat: 40.4168, lng: -3.7038, imageUrl: "https://randomuser.me/api/portraits/men/18.jpg" },
  { id: "19", name: "Ananya", country: "Bangladesh", city: "Dhaka", lat: 23.8103, lng: 90.4125, imageUrl: "https://randomuser.me/api/portraits/women/79.jpg" },
  { id: "20", name: "Mateo", country: "Argentine", city: "Buenos Aires", lat: -34.6037, lng: -58.3816, imageUrl: "https://randomuser.me/api/portraits/men/64.jpg" },
  { id: "21", name: "Nora", country: "Norvège", city: "Oslo", lat: 59.9139, lng: 10.7522, imageUrl: "https://randomuser.me/api/portraits/women/8.jpg" },
  { id: "22", name: "Hassan", country: "Turquie", city: "Istanbul", lat: 41.0082, lng: 28.9784, imageUrl: "https://randomuser.me/api/portraits/men/47.jpg" },
  { id: "23", name: "Mai", country: "Viêt Nam", city: "Hanoï", lat: 21.0285, lng: 105.8542, imageUrl: "https://randomuser.me/api/portraits/women/85.jpg" },
  { id: "24", name: "James", country: "Royaume-Uni", city: "Londres", lat: 51.5074, lng: -0.1278, imageUrl: "https://randomuser.me/api/portraits/men/7.jpg" },
  { id: "25", name: "Aya", country: "Nigeria", city: "Lagos", lat: 6.5244, lng: 3.3792, imageUrl: "https://randomuser.me/api/portraits/women/50.jpg" },
  { id: "26", name: "Piotr", country: "Pologne", city: "Varsovie", lat: 52.2297, lng: 21.0122, imageUrl: "https://randomuser.me/api/portraits/men/29.jpg" },
  { id: "27", name: "Sakura", country: "Thaïlande", city: "Bangkok", lat: 13.7563, lng: 100.5018, imageUrl: "https://randomuser.me/api/portraits/women/63.jpg" },
  { id: "28", name: "Liam", country: "Irlande", city: "Dublin", lat: 53.3498, lng: -6.2603, imageUrl: "https://randomuser.me/api/portraits/men/52.jpg" },
  { id: "29", name: "Lucia", country: "Pérou", city: "Lima", lat: -12.0464, lng: -77.0428, imageUrl: "https://randomuser.me/api/portraits/women/41.jpg" },
  { id: "30", name: "Erik", country: "Pays-Bas", city: "Amsterdam", lat: 52.3676, lng: 4.9041, imageUrl: "https://randomuser.me/api/portraits/men/15.jpg" },
  { id: "31", name: "Zahra", country: "Iran", city: "Téhéran", lat: 35.6892, lng: 51.389, imageUrl: "https://randomuser.me/api/portraits/women/74.jpg" },
  { id: "32", name: "Nikola", country: "Grèce", city: "Athènes", lat: 37.9838, lng: 23.7275, imageUrl: "https://randomuser.me/api/portraits/men/83.jpg" },
  { id: "33", name: "Camille", country: "Belgique", city: "Bruxelles", lat: 50.8503, lng: 4.3517, imageUrl: "https://randomuser.me/api/portraits/women/26.jpg" },
  { id: "34", name: "Ravi", country: "Sri Lanka", city: "Colombo", lat: 6.9271, lng: 79.8612, imageUrl: "https://randomuser.me/api/portraits/men/91.jpg" },
  { id: "35", name: "Isabella", country: "Chili", city: "Santiago", lat: -33.4489, lng: -70.6693, imageUrl: "https://randomuser.me/api/portraits/women/95.jpg" },
  { id: "36", name: "Kwame", country: "Ghana", city: "Accra", lat: 5.6037, lng: -0.187, imageUrl: "https://randomuser.me/api/portraits/men/70.jpg" },
  { id: "37", name: "Hana", country: "Indonésie", city: "Jakarta", lat: -6.2088, lng: 106.8456, imageUrl: "https://randomuser.me/api/portraits/women/36.jpg" },
  { id: "38", name: "Alex", country: "Canada", city: "Toronto", lat: 43.6532, lng: -79.3832, imageUrl: "https://randomuser.me/api/portraits/men/3.jpg" },
  { id: "39", name: "Marta", country: "Portugal", city: "Lisbonne", lat: 38.7223, lng: -9.1393, imageUrl: "https://randomuser.me/api/portraits/women/4.jpg" },
  { id: "40", name: "Youssef", country: "Tunisie", city: "Tunis", lat: 36.8065, lng: 10.1815, imageUrl: "https://randomuser.me/api/portraits/men/60.jpg" },
];

export function pickRoundPeople(count: number): Person[] {
  const shuffled = [...PEOPLE].sort(() => Math.random() - 0.5);
  const out: Person[] = [];
  while (out.length < count) {
    out.push(...shuffled);
  }
  return out.slice(0, count);
}
