import lagos from "@/assets/stay-lagos.jpg";
import accra from "@/assets/stay-accra.jpg";
import nairobi from "@/assets/stay-nairobi.jpg";
import kigali from "@/assets/stay-kigali.jpg";
import zanzibar from "@/assets/dest-zanzibar.jpg";
import marrakech from "@/assets/dest-marrakech.jpg";
import capetown from "@/assets/dest-capetown.jpg";
import serengeti from "@/assets/dest-serengeti.jpg";
import type { Stay } from "@/components/stays/StayCard";

export const stays: Stay[] = [
  {
    id: "skyline-lagos",
    title: "Skyline Penthouse",
    location: "Victoria Island, Lagos",
    price: 184,
    rating: 4.92,
    reviews: 218,
    img: lagos,
    badge: "Superhost",
  },
  {
    id: "thatched-accra",
    title: "Palmgrove Beach Cottage",
    location: "Labadi Beach, Accra",
    price: 96,
    rating: 4.87,
    reviews: 142,
    img: accra,
  },
  {
    id: "garden-nairobi",
    title: "Karura Garden Villa",
    location: "Karen, Nairobi",
    price: 215,
    rating: 4.95,
    reviews: 304,
    img: nairobi,
    badge: "Guest favourite",
  },
  {
    id: "hillside-kigali",
    title: "Thousand Hills Retreat",
    location: "Nyarutarama, Kigali",
    price: 142,
    rating: 4.89,
    reviews: 96,
    img: kigali,
  },
  {
    id: "shore-zanzibar",
    title: "Indian Ocean Pavilion",
    location: "Paje, Zanzibar",
    price: 268,
    rating: 4.97,
    reviews: 412,
    img: zanzibar,
    badge: "Luxe",
  },
  {
    id: "riad-marrakech",
    title: "Heritage Riad Saffron",
    location: "Medina, Marrakech",
    price: 158,
    rating: 4.91,
    reviews: 287,
    img: marrakech,
  },
  {
    id: "table-capetown",
    title: "Table Mountain House",
    location: "Camps Bay, Cape Town",
    price: 320,
    rating: 4.96,
    reviews: 189,
    img: capetown,
    badge: "Superhost",
  },
  {
    id: "tent-serengeti",
    title: "Acacia Safari Tent",
    location: "Serengeti, Tanzania",
    price: 412,
    rating: 4.98,
    reviews: 156,
    img: serengeti,
    badge: "Rare find",
  },
];

export const getStay = (id: string) => stays.find((s) => s.id === id);
