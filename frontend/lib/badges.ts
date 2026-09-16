import {
  BookOpen,
  BookMarked,
  Library,
  Trophy,
  Crown,
  Medal,
  Zap,
  Flame,
  CalendarCheck,
  Sparkles,
  Users,
  Star,
  MessageCircle,
  Moon,
  Sunrise,
  Globe,
  Award,
  Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Single source of truth for badge metadata. `kind` keys mirror the backend
 * `BadgeKind` enum (see CurioMap.Api/Domain/Enums.cs) and the `badge_kind`
 * payload on `badge_earned` feed events.
 */
export interface BadgeMeta {
  name: string;
  description: string;
  icon: LucideIcon;
}

export const BADGE_CATALOG: Record<string, BadgeMeta> = {
  FirstBook: { name: "First Book", description: "Finished your first book", icon: BookOpen },
  FiveBooks: { name: "Bookworm", description: "Finished 5 books", icon: BookMarked },
  TenBooks: { name: "Bibliophile", description: "Finished 10 books", icon: Library },
  TwentyFiveBooks: { name: "Devourer", description: "Finished 25 books", icon: Trophy },
  FiftyBooks: { name: "Legend", description: "Finished 50 books", icon: Crown },
  HundredBooks: { name: "Centurion", description: "Finished 100 books", icon: Medal },
  Streak3: { name: "Kindling", description: "3-day reading streak", icon: Zap },
  Streak7: { name: "On Fire", description: "7-day reading streak", icon: Flame },
  Streak30: { name: "Unstoppable", description: "30-day reading streak", icon: CalendarCheck },
  Streak100: { name: "Eternal Flame", description: "100-day reading streak", icon: Sparkles },
  FirstCircle: { name: "Circle Starter", description: "Joined a reading circle", icon: Users },
  FirstReview: { name: "Critic", description: "Rated your first book", icon: Star },
  FirstMessage: { name: "Chatterbox", description: "Posted your first message", icon: MessageCircle },
  NightOwl: { name: "Night Owl", description: "Read after midnight", icon: Moon },
  EarlyBird: { name: "Early Bird", description: "Read before 6am", icon: Sunrise },
  Globetrotter: { name: "Globetrotter", description: "Books from 5+ authors", icon: Globe },
  CircleStreak7: { name: "Book Club Captain", description: "Circle reached a 7-day group streak", icon: Award },
  CircleStreak30: { name: "Marathon Circle", description: "Circle reached a 30-day group streak", icon: Rocket },
};

export function badgeMeta(kind: string): BadgeMeta {
  return BADGE_CATALOG[kind] ?? { name: kind, description: "A reading milestone", icon: Trophy };
}