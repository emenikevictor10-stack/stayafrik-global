import lekki from "@/assets/prop-lekki.jpg";
import vi from "@/assets/prop-vi.jpg";
import maitama from "@/assets/prop-maitama.jpg";
import ikoyi from "@/assets/prop-ikoyi.jpg";
import land from "@/assets/prop-land.jpg";
import wuse from "@/assets/prop-wuse.jpg";

export type PropertyType = "Shortlet" | "For Sale" | "Land" | "Commercial";

export type Property = {
  id: string;
  title: string;
  location: string;
  type: PropertyType;
  price: string;
  priceNum: number;
  beds: number;
  baths: number;
  area: string;
  verified: boolean;
  agent: string;
  agentTag: string;
  agentEmoji: string;
  emoji: string;
  image: string;
  rating: number;
  reviews: number;
  desc: string;
  amenities: { emoji: string; label: string }[];
};

const baseAmenities = [
  { emoji: "📶", label: "Fast Wi-Fi" },
  { emoji: "❄️", label: "AC" },
  { emoji: "🔌", label: "24/7 Power" },
  { emoji: "🚿", label: "Hot water" },
  { emoji: "🍳", label: "Kitchen" },
  { emoji: "🛡️", label: "24/7 Security" },
];

export const PROPERTIES: Property[] = [
  {
    id: "p1",
    title: "Maitama Serviced Suite",
    location: "Maitama, Abuja",
    type: "Shortlet",
    price: "₦150,000",
    priceNum: 150000,
    beds: 2, baths: 2, area: "120sqm",
    verified: true,
    agent: "Amaka Osei", agentTag: "Verified Agent", agentEmoji: "👩🏾‍💼",
    emoji: "🏙️", image: maitama,
    rating: 4.92, reviews: 184,
    desc: "Premium serviced 2-bedroom apartment in Maitama diplomatic zone. Fully furnished, WiFi, 24/7 generator, concierge.",
    amenities: baseAmenities,
  },
  {
    id: "p2",
    title: "Ikoyi Luxury Penthouse",
    location: "Ikoyi, Lagos",
    type: "Shortlet",
    price: "₦500,000",
    priceNum: 500000,
    beds: 4, baths: 3, area: "320sqm",
    verified: true,
    agent: "Kofi Mensah", agentTag: "Verified Agent", agentEmoji: "👨🏾‍💼",
    emoji: "🌆", image: ikoyi,
    rating: 4.98, reviews: 92,
    desc: "Jaw-dropping penthouse with 360° city views, private rooftop terrace, jacuzzi, chef's kitchen, and floor-to-ceiling glass.",
    amenities: [...baseAmenities, { emoji: "🛁", label: "Jacuzzi" }, { emoji: "🌃", label: "Skyline view" }],
  },
  {
    id: "p3",
    title: "5-Bed Detached, Lekki Phase 1",
    location: "Lekki Phase 1, Lagos",
    type: "For Sale",
    price: "₦185,000,000",
    priceNum: 185000000,
    beds: 5, baths: 4, area: "600sqm",
    verified: true,
    agent: "Emeka Ihejirika", agentTag: "Verified Agent", agentEmoji: "🧔🏾",
    emoji: "🏡", image: lekki,
    rating: 4.9, reviews: 24,
    desc: "Fully detached 5-bedroom home with BQ, double garage, and C of O. Title verified against Lagos State Land Registry.",
    amenities: [
      { emoji: "🚗", label: "Double garage" },
      { emoji: "🌳", label: "Garden" },
      { emoji: "📜", label: "C of O" },
      { emoji: "🛡️", label: "Gated estate" },
    ],
  },
  {
    id: "p4",
    title: "3-Bed Apartment, V.I",
    location: "Victoria Island, Lagos",
    type: "For Sale",
    price: "₦95,000,000",
    priceNum: 95000000,
    beds: 3, baths: 2, area: "180sqm",
    verified: true,
    agent: "Ngozi Eze", agentTag: "Verified Owner", agentEmoji: "👩🏾",
    emoji: "🌊", image: vi,
    rating: 4.85, reviews: 18,
    desc: "Fully furnished 3-bedroom apartment on the 14th floor with panoramic ocean views. C of O confirmed.",
    amenities: [
      { emoji: "🌊", label: "Ocean view" },
      { emoji: "🛗", label: "Elevator" },
      { emoji: "🏊", label: "Pool" },
      { emoji: "📜", label: "C of O" },
    ],
  },
  {
    id: "p5",
    title: "Land 900sqm, GRA Phase 2",
    location: "GRA Phase 2, Port Harcourt",
    type: "Land",
    price: "₦55,000,000",
    priceNum: 55000000,
    beds: 0, baths: 0, area: "900sqm",
    verified: true,
    agent: "Blessing Effiong", agentTag: "Verified Owner", agentEmoji: "👩🏾‍🦱",
    emoji: "🌱", image: land,
    rating: 4.8, reviews: 6,
    desc: "900sqm residential plot in prestigious GRA Phase 2. C of O available. Survey plan confirmed.",
    amenities: [
      { emoji: "📜", label: "C of O" },
      { emoji: "📐", label: "Survey plan" },
      { emoji: "🏘️", label: "Quiet area" },
    ],
  },
  {
    id: "p6",
    title: "Commercial Plot, Wuse",
    location: "Wuse Zone 5, Abuja",
    type: "Commercial",
    price: "₦420,000,000",
    priceNum: 420000000,
    beds: 0, baths: 0, area: "1,200sqm",
    verified: true,
    agent: "Tunde Bakare", agentTag: "Verified Agent", agentEmoji: "👨🏾‍💼",
    emoji: "🏢", image: wuse,
    rating: 4.7, reviews: 4,
    desc: "Prime commercial plot in Wuse Zone 5 with C of O. Perfect for mixed-use development. All encumbrances clear.",
    amenities: [
      { emoji: "📜", label: "C of O" },
      { emoji: "🏗️", label: "Buildable" },
      { emoji: "🛣️", label: "Road access" },
    ],
  },
];

export const CITIES = [
  { emoji: "🏝️", name: "Lagos", count: 1240 },
  { emoji: "🏛️", name: "Abuja", count: 612 },
  { emoji: "⚓", name: "Port Harcourt", count: 184 },
  { emoji: "🌴", name: "Ibadan", count: 96 },
  { emoji: "🛕", name: "Enugu", count: 72 },
  { emoji: "🎭", name: "Calabar", count: 58 },
];

export const CATEGORIES = [
  { emoji: "🏖️", label: "Shortlets", filter: "Shortlet" as const },
  { emoji: "🏡", label: "Homes", filter: "For Sale" as const },
  { emoji: "🌱", label: "Land", filter: "Land" as const },
  { emoji: "🏢", label: "Commercial", filter: "Commercial" as const },
];
