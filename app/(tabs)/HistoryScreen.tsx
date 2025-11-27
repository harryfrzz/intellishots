import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getChatHistory, ChatSession } from '@/services/Storage'; 

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [historyData, setHistoryData] = useState<ChatSession[]>([]);

  // Reload data every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      const data = getChatHistory();
      setHistoryData(data);
    }, [])
  );

  const filteredData = useMemo(() => {
    if (!searchQuery) return historyData;
    const lowerQuery = searchQuery.toLowerCase();
    return historyData.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.lastMessage.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, historyData]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // --- Updated Render Item with TouchableOpacity ---
  const renderItem = ({ item, index }: { item: ChatSession; index: number }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(300)}
      layout={Layout.springify()}
    >
      <TouchableOpacity 
        style={styles.itemContainer}
        activeOpacity={0.7}
        onPress={() => {
          // Navigate to the dynamic chat details screen
          router.push(`/chat/${item.id}`);
        }}
      >
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
            <IconSymbol name="chevron.right" size={14} color="#444" style={styles.chevron} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="History" 
        onSearch={setSearchQuery} 
      />

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 80 }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="clock" size={48} color="#333" />
            <Text style={styles.emptyText}>No chat history</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    paddingBottom: 100, 
  },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatarContainer: { marginRight: 16 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    marginRight: 10,
  },
  chevron: { opacity: 0.5 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  }
});