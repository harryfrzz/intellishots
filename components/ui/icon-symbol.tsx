import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// Import Lucide React Native icons
import {
  ArrowUp,
  BookOpen,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  History,
  Home,
  Image,
  ImageIcon,
  Info,
  Layers,
  LucideIcon,
  MapPin,
  MapPinOff,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  Trash2,
  X,
  XCircle,
} from 'lucide-react-native';

// 1. Map your existing SF Symbol names to Lucide icons
const ICON_MAPPING: Record<string, LucideIcon> = {
  // Tabs (Lucide names)
  'home': Home,
  'image': Image,
  'sparkles': Sparkles,
  'clock': Clock,
  'book-open': BookOpen,
  'layers': Layers,
  'history': History,
  'settings': Settings,
  
  // Legacy SF Symbol names (for compatibility)
  'house.fill': Home,
  'photo.on.rectangle': Image,
  'clock.fill': Clock,
  'books.vertical.fill': BookOpen,
  'square.stack.fill': Layers,
  'gearshape.fill': Settings,

  // UI Elements (Lucide names)
  'trash': Trash2,
  'info': Info,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'search': Search,
  'x': X,
  'x-circle': XCircle,
  'arrow-up': ArrowUp,
  'plus': Plus,
  'copy': Copy,
  'refresh-cw': RefreshCw,
  'calendar': Calendar,
  'calendar-plus': CalendarPlus,
  'map-pin': MapPin,
  'map-pin-off': MapPinOff,
  'check': Check,
  'check-circle': CheckCircle,
  'square-pen': SquarePen,
  'image-icon': ImageIcon,

  // Legacy SF Symbol names (for compatibility)
  'trash.fill': Trash2,
  'info.circle': Info,
  'chevron.left': ChevronLeft,
  'chevron.right': ChevronRight,
  'magnifyingglass': Search,
  'xmark': X,
  'xmark.circle.fill': XCircle,
  'arrow.up': ArrowUp,
  'circle.stack': Layers,
  'doc.on.doc': Copy,
  'arrow.clockwise': RefreshCw,
  'calendar.badge.plus': CalendarPlus,
  'pin': MapPin,
  'pin.fill': MapPin,
  'pin.slash': MapPinOff,
  'checkmark': Check,
  'checkmark.circle': CheckCircle,
  'checkmark.circle.fill': CheckCircle,
  'square.and.pencil': SquarePen,
  'photo': ImageIcon,
};

// 2. Define the Valid Icon Names based on the mapping keys
export type IconSymbolName = keyof typeof ICON_MAPPING;

/**
 * An Icon component that wraps Lucide icons but keeps your existing API compatible.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string; // Optional: kept for API compatibility
}) {
  const IconComponent = ICON_MAPPING[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in mapping.`);
    return null;
  }

  // Lucide uses 'color' for stroke and 'size' for height/width
  return <IconComponent color={color} size={size} style={style} />;

}