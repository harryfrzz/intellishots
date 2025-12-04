import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// Import Heroicons (Solid for filled look, Outline for strokes)
// You can mix and match. I used mostly Solid for a bold, iOS-like look.
import {
  ArrowPathIcon,
  ArrowUpIcon,
  BookOpenIcon,
  CalendarDaysIcon, // for arrow.clockwise (refresh)
  CalendarIcon,
  CheckCircleIcon, // for pin
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  HomeIcon,
  RectangleGroupIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon, // for calendar.badge.plus
  MapPinIcon, // for square.stack.fill (library)
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  Square2StackIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
  RectangleStackIcon,
  CircleStackIcon,
  ChatBubbleLeftRightIcon,
} from 'react-native-heroicons/solid';

// If you want specific icons to be outlined, import them here:
// import { XMarkIcon as XMarkOutline } from 'react-native-heroicons/outline';

// 1. Map your existing SF Symbol names to Heroicons

const ICON_MAPPING = {
  // Tabs
  'house.fill': HomeIcon,
  'photo.on.rectangle': PhotoIcon,
  'sparkles': SparklesIcon,
  'clock.fill': ClockIcon,
  'books.vertical.fill': BookOpenIcon,
  'square.stack.fill': Square2StackIcon,
  'gearshape.fill': Cog6ToothIcon,

  // UI Elements
  'trash': TrashIcon,
  'trash.fill': TrashIcon,
  'info.circle': InformationCircleIcon,
  'chevron.left': ChevronLeftIcon,
  'chevron.right': ChevronRightIcon,
  'magnifyingglass': MagnifyingGlassIcon,
  'xmark': XMarkIcon,
  'xmark.circle.fill': XCircleIcon,
  'arrow.up': ArrowUpIcon,
  'plus': PlusIcon,
  'chat': ChatBubbleLeftRightIcon,
  'circle.stack': CircleStackIcon,
  'stack': RectangleStackIcon,
  'doc.on.doc': DocumentDuplicateIcon,
  'arrow.clockwise': ArrowPathIcon,
  'calendar': CalendarIcon,
  'calendar.badge.plus': CalendarDaysIcon,
  'pin': MapPinIcon,
  'pin.fill': MapPinIcon,
  'pin.slash': MapPinIcon, // You might want a specific slash icon, or handle logic elsewhere
  'checkmark': CheckIcon,
  'checkmark.circle': CheckCircleIcon,
  'checkmark.circle.fill': CheckCircleIcon,
  'square.and.pencil': PencilSquareIcon,
  'photo': PhotoIcon,
} as const;

// 2. Define the Valid Icon Names based on the mapping keys
export type IconSymbolName = keyof typeof ICON_MAPPING;

/**
 * An Icon component that wraps Heroicons but keeps your existing API compatible.
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
  weight?: string; // Optional: Heroicons don't use weight, but we keep prop to avoid errors
}) {
  const IconComponent = ICON_MAPPING[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in mapping.`);
    return null;
  }

  // Heroicons use 'color' for fill/stroke and 'size' for height/width
  return <IconComponent color={color} size={size} style={style} />;
}