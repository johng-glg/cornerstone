import {
  Shield,
  Heart,
  Scale,
  Lock,
  Wallet,
  Users,
  Building2,
  Handshake,
  Sparkles,
  FileCheck2,
  Landmark,
  LifeBuoy,
  BadgeCheck,
  Eye,
  Coins,
  Phone,
  Mail,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@content/types';

const map: Record<IconName, LucideIcon> = {
  shield: Shield,
  heart: Heart,
  scale: Scale,
  lock: Lock,
  wallet: Wallet,
  users: Users,
  building: Building2,
  handshake: Handshake,
  sparkles: Sparkles,
  fileCheck: FileCheck2,
  landmark: Landmark,
  lifeBuoy: LifeBuoy,
  badgeCheck: BadgeCheck,
  eye: Eye,
  coins: Coins,
  phone: Phone,
  mail: Mail,
  mapPin: MapPin,
};

export function Icon({
  name,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  name: IconName;
  className?: string;
  'aria-hidden'?: boolean;
}) {
  const Cmp = map[name];
  return <Cmp className={className} aria-hidden={ariaHidden} />;
}
