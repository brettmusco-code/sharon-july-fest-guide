export interface EventItem {
  id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  lat: number;
  lng: number;
  category: "food" | "entertainment" | "kids" | "general";
  icon: string;
}

export const events: EventItem[] = [
  {
    id: "1",
    title: "Opening Ceremony & Flag Raising",
    description: "Kick off the celebration with the flag raising ceremony at Memorial Park.",
    time: "9:00 AM",
    location: "Memorial Park Beach",
    lat: 42.1108,
    lng: -71.1770,
    category: "general",
    icon: "🇺🇸",
  },
  {
    id: "2",
    title: "Independence Day Parade",
    description: "Floats, marching bands, and community groups march through downtown Sharon.",
    time: "10:00 AM",
    location: "Main Street",
    lat: 42.1123,
    lng: -71.1785,
    category: "entertainment",
    icon: "🎺",
  },
  {
    id: "3",
    title: "Kids Zone & Games",
    description: "Face painting, sack races, water balloon toss, and more fun for all ages!",
    time: "11:00 AM - 4:00 PM",
    location: "Memorial Park Field",
    lat: 42.1102,
    lng: -71.1758,
    category: "kids",
    icon: "🎈",
  },
  {
    id: "4",
    title: "BBQ & Food Trucks",
    description: "Classic American BBQ, ice cream, fried dough, and local food trucks.",
    time: "11:30 AM - 6:00 PM",
    location: "Park Pavilion Area",
    lat: 42.1112,
    lng: -71.1775,
    category: "food",
    icon: "🌭",
  },
  {
    id: "5",
    title: "Live Music: The Sharon All-Stars",
    description: "Local bands perform patriotic hits and summer classics on the main stage.",
    time: "2:00 PM - 5:00 PM",
    location: "Main Stage",
    lat: 42.1105,
    lng: -71.1765,
    category: "entertainment",
    icon: "🎵",
  },
  {
    id: "6",
    title: "Grand Fireworks Show",
    description: "The spectacular grand finale! Best viewed from the beach and surrounding fields.",
    time: "9:15 PM",
    location: "Over Lake Massapoag",
    lat: 42.1095,
    lng: -71.1780,
    category: "entertainment",
    icon: "🎆",
  },
];

export const categoryColors: Record<EventItem["category"], string> = {
  food: "#f59e0b",
  entertainment: "#6366f1",
  kids: "#10b981",
  general: "#8b5cf6",
};

export const categoryLabels: Record<EventItem["category"], string> = {
  food: "Food & Drink",
  entertainment: "Entertainment",
  kids: "Kids",
  general: "General",
};
