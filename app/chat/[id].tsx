import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getChatSession, ChatSession, ChatMessage } from '@/services/Storage';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<ChatSession | null>(null);
  
  useEffect(() => {
    if (id) {
      const data = getChatSession(id);
      setSession(data);
    }
  }, [id]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View 
        entering={FadeInUp.duration(300)} 
        layout={Layout.springify()}
        style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAi]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.avatarGradient}>
               <IconSymbol name="sparkles" size={14} color="#fff" />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.messageImage} contentFit="cover" />
          )}
          {item.content ? (
            isUser ? (
              <Text style={styles.userText}>{item.content}</Text>
            ) : (
              <Markdown style={markdownStyles}>{item.content}</Markdown>
            )
          ) : null}
        </View>
      </Animated.View>
    );
  };

  if (!session) {
    return (
      <View style={styles.container}>
        {/* Hide Native Header here as well */}
        <Stack.Screen options={{ headerShown: false }} />
        
        <CustomHeader title="Loading..." showBackButton showSearch={false} />
        <View style={styles.center}>
            <ActivityIndicator color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- FIX: This line removes the native header --- */}
      <Stack.Screen options={{ headerShown: false }} />

      <CustomHeader 
        title={session.title || "Chat Details"} 
        showBackButton={true} 
        showSearch={false}
      />

      <FlatList
        data={session.messages} 
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 20 }
        ]}
        inverted={true} 
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  messageRow: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: {
    borderRadius: 20,
    padding: 12,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  bubbleUser: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#262626',
    borderBottomLeftRadius: 4,
    marginLeft: 8,
  },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiAvatar: { marginBottom: 4 },
  avatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const markdownStyles = StyleSheet.create({
  body: { color: '#e1e1e1', fontSize: 16, lineHeight: 22 },
  code_inline: { backgroundColor: '#333', color: '#ffdd00', borderRadius: 4 },
  code_block: { backgroundColor: '#111', borderColor: '#333', borderRadius: 8, marginVertical: 4 },
});