import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  Dimensions, 
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeInUp, 
  Layout, 
  FadeInDown, 
  FadeOutDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { 
  getChatHistory, 
  ChatSession, 
  togglePinChatSession, 
  deleteBatchChatSessions 
} from '@/services/Storage'; 

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// TAB BAR HEIGHT APPROXIMATION
const TAB_BAR_HEIGHT = 85; 

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [historyData, setHistoryData] = useState<ChatSession[]>([]);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bottom Sheet State
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Load Data
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = () => {
    const sessions = getChatHistory();
    const sorted = sessions.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp - a.timestamp;
    });
    setHistoryData(sorted);
  };

  // --- Sheet Animation Logic (NON-SPRINGY) ---

  const openSheet = (item: ChatSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveSession(item);
    setIsSheetVisible(true);
    
    // Smooth Timing
    sheetTranslateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeSheet = () => {
    sheetTranslateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    }, () => {
        runOnJS(setIsSheetVisible)(false);
        runOnJS(setActiveSession)(null);
    });
  };

  // --- Actions ---

  const handleTogglePin = () => {
    if (!activeSession) return;
    togglePinChatSession(activeSession.id);
    closeSheet();
    loadHistory(); 
  };

  const handleStartSelection = () => {
    if (!activeSession) return;
    closeSheet();
    setIsSelectionMode(true);
    const newSet = new Set<string>();
    newSet.add(activeSession.id);
    setSelectedIds(newSet);
  };

  const handleDeleteSingle = () => {
    if (!activeSession) return;
    const idToDelete = activeSession.id;
    closeSheet();
    setTimeout(() => {
        deleteBatchChatSessions([idToDelete]);
        loadHistory();
    }, 300);
  };

  const handleDeleteBatch = () => {
    Alert.alert(
      "Delete Chats",
      `Delete ${selectedIds.size} conversations?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            deleteBatchChatSessions(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            loadHistory();
          }
        }
      ]
    );
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (newSet.size === 0) setIsSelectionMode(false);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    Haptics.selectionAsync();
  };

  // --- Render Item ---

  const renderItem = ({ item, index }: { item: ChatSession; index: number }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 50).duration(300)} 
        layout={Layout.springify()}
      >
        <TouchableOpacity 
          style={[styles.itemContainer, isSelected && styles.itemSelected]}
          activeOpacity={0.7}
          onPress={() => {
            if (isSelectionMode) {
              toggleSelection(item.id);
            } else {
              router.push(`/chat/${item.id}`);
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) openSheet(item);
          }}
        >
          {isSelectionMode && (
             <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
               {isSelected && <IconSymbol name="checkmark" size={12} color="#000" />}
             </View>
          )}

          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={item.isPinned ? ['#FFD700', '#FFA500'] : ['#2a2a2a', '#3a3a3a']}
              style={styles.avatar}
            >
              <IconSymbol 
                name={item.isPinned ? "pin.fill" : "sparkles"} 
                size={item.isPinned ? 18 : 22} 
                color={item.isPinned ? "#000" : "#fff"} 
              />
            </LinearGradient>
          </View>

          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            <View style={styles.messageRow}>
              <Text style={styles.message} numberOfLines={2}>
                {item.lastMessage}
              </Text>
              {!isSelectionMode && <IconSymbol name="chevron.right" size={14} color="#444" style={styles.chevron} />}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return historyData;
    const lowerQuery = searchQuery.toLowerCase();
    return historyData.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.lastMessage.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, historyData]);

  // --- Animated Styles ---
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isSheetVisible ? 1 : 0),
    pointerEvents: isSheetVisible ? 'auto' : 'none',
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Calculate bottom offset for Floating elements to sit above Tab Bar
  const FLOAT_BOTTOM = insets.bottom + TAB_BAR_HEIGHT + 10;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="History" 
        onSearch={setSearchQuery} 
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onCancelSelection={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
      />

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 80 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="clock" size={48} color="#333" />
            <Text style={styles.emptyText}>No chat history</Text>
          </View>
        }
      />

      {/* --- Batch Delete Button --- */}
      {isSelectionMode && (
        <Animated.View 
          entering={FadeInDown.duration(300)} 
          exiting={FadeOutDown.duration(300)}
          style={[styles.floatingMenu, { bottom: FLOAT_BOTTOM }]}
        >
          <BlurView intensity={90} tint="dark" style={styles.menuBlur}>
            <TouchableOpacity 
                onPress={handleDeleteBatch} 
                style={styles.menuButton}
                disabled={selectedIds.size === 0}
            >
              <IconSymbol name="trash.fill" size={20} color="#ff453a" />
              <Text style={styles.menuText}>Delete ({selectedIds.size})</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}

      {/* --- Context Bottom Sheet --- */}
      {isSheetVisible && activeSession && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet}>
            <Animated.View style={[styles.backdrop, backdropStyle]} />
          </Pressable>

          <Animated.View 
            style={[
              styles.sheetContainer, 
              // Position above the Tab Bar + some margin
              { bottom: FLOAT_BOTTOM }, 
              sheetStyle
            ]}
          >
            <BlurView intensity={80} tint="dark" style={styles.sheetBlur}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>{activeSession.title}</Text>
                    <Text style={styles.sheetSubtitle}>Choose an action</Text>
                </View>

                <View style={styles.sheetDivider} />

                <TouchableOpacity onPress={handleTogglePin} style={styles.sheetOption}>
                    <View style={styles.optionIcon}>
                        <IconSymbol name={activeSession.isPinned ? "pin.slash" : "pin"} size={22} color="#fff" />
                    </View>
                    <Text style={styles.optionText}>{activeSession.isPinned ? "Unpin Chat" : "Pin Chat"}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleStartSelection} style={styles.sheetOption}>
                    <View style={styles.optionIcon}>
                        <IconSymbol name="checkmark.circle" size={22} color="#fff" />
                    </View>
                    <Text style={styles.optionText}>Select Messages</Text>
                </TouchableOpacity>

                <View style={styles.sheetDivider} />

                <TouchableOpacity onPress={handleDeleteSingle} style={styles.sheetOption}>
                    <View style={styles.optionIcon}>
                        <IconSymbol name="trash" size={22} color="#ff453a" />
                    </View>
                    <Text style={[styles.optionText, { color: '#ff453a' }]}>Delete Chat</Text>
                </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// =====================================================================
// STYLES
// =====================================================================

const styles = StyleSheet.create({
  // --- Container ---
  container: { flex: 1, backgroundColor: '#000' },
  listContent: { paddingBottom: 150 },
  
  // --- List Item ---
  itemContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  itemSelected: { backgroundColor: 'rgba(255,255,255,0.1)' },
  
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#666', marginRight: 16, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#fff', borderColor: '#fff' },

  avatarContainer: { marginRight: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  
  textContainer: { flex: 1, justifyContent: 'center', gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  time: { color: '#666', fontSize: 12, fontWeight: '500', marginLeft: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  message: { color: '#aaa', fontSize: 14, lineHeight: 20, flex: 1, marginRight: 10 },
  chevron: { opacity: 0.5 },
  
  // --- Empty State ---
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600' },

  // --- Floating Delete Menu ---
  floatingMenu: { 
    position: 'absolute', 
    alignSelf: 'center', 
    borderRadius: 30, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 10 
  },
  menuBlur: { paddingVertical: 12, paddingHorizontal: 24 },
  menuButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuText: { color: '#ff453a', fontSize: 16, fontWeight: '600' },

  // --- Custom Context Menu (Floating Sheet) ---
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  sheetContainer: {
    position: 'absolute',
    left: 16, // Side Margin
    right: 16, // Side Margin
    borderRadius: 24, // Fully Rounded
    overflow: 'hidden',
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sheetBlur: {
    padding: 20,
    backgroundColor: 'rgba(30,30,30,0.95)', // Slightly more opaque for context
  },
  sheetHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Taller touch target
  },
  optionIcon: {
    width: 36,
    alignItems: 'flex-start',
  },
  optionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
});