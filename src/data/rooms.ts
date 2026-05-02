import type { Room } from "../types";

export const ROOMS: Room[] = [
  {
    id: "genel",
    name: "Genel Sohbet",
    description: "Herkese açık ana sohbet odası",
    icon: "💬",
    color: "from-blue-500 to-indigo-600",
    category: "Popüler",
  },
  {
    id: "teknoloji",
    name: "Teknoloji",
    description: "Yazılım, donanım ve yenilikler",
    icon: "💻",
    color: "from-cyan-500 to-blue-600",
    category: "Popüler",
  },
  {
    id: "oyun",
    name: "Oyun Dünyası",
    description: "Oyuncular için buluşma noktası",
    icon: "🎮",
    color: "from-purple-500 to-pink-600",
    category: "Eğlence",
  },
  {
    id: "muzik",
    name: "Müzik 📻",
    description: "Canlı radyo + sohbet · Şarkı önerileri",
    icon: "🎵",
    color: "from-pink-500 to-rose-600",
    category: "Eğlence",
  },
  {
    id: "film",
    name: "Film & Dizi",
    description: "Yeni çıkanlar ve incelemeler",
    icon: "🎬",
    color: "from-amber-500 to-orange-600",
    category: "Eğlence",
  },
  {
    id: "spor",
    name: "Spor",
    description: "Maçlar, takımlar ve sporcular",
    icon: "⚽",
    color: "from-green-500 to-emerald-600",
    category: "Aktivite",
  },
  {
    id: "yemek",
    name: "Yemek & Tarif",
    description: "Lezzetli tarifler paylaşımı",
    icon: "🍳",
    color: "from-orange-500 to-red-600",
    category: "Yaşam",
  },
  {
    id: "seyahat",
    name: "Seyahat",
    description: "Gezi rotaları ve deneyimler",
    icon: "✈️",
    color: "from-sky-500 to-cyan-600",
    category: "Yaşam",
  },
  {
    id: "kitap",
    name: "Kitap Kulübü",
    description: "Okuma önerileri ve tartışmalar",
    icon: "📚",
    color: "from-yellow-500 to-amber-600",
    category: "Kültür",
  },
];

export const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

export function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
