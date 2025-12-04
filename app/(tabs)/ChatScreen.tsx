import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Image as RNImage,
  ScrollView,
  Alert 
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInUp, Layout, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { sendChatRequest, ChatMessage, initLocalAI } from '@/services/LocalAI';
import { optimizeBatchImages } from '@/services/ImageUtils';
import { saveChatSession } from '@/services/Storage';

const TAB_BAR_HEIGHT = 85; 
const MAX_IMAGES = 3;

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    initLocalAI().catch(e => console.log("Background init failed", e));
  }, []);

  useEffect(() => {
    if (params.incomingImages) {
      try {
        const uris = JSON.parse(params.incomingImages as string) as string[];
        if (uris && uris.length > 0) {
          processIncomingImages(uris);
          router.setParams({ incomingImages: undefined });
        }
      } catch (e) {
        console.error("Failed to parse incoming images", e);
      }
    }
  }, [params.incomingImages]);

  useEffect(() => {
    if (messages.length > 0) {
      const savedId = saveChatSession(messages, currentSessionId);
      if (savedId && savedId !== currentSessionId) {
        setCurrentSessionId(savedId);
      }
    }
  }, [messages]);

  const processIncomingImages = async (uris: string[]) => {
    if (selectedImages.length + uris.length > MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can only add up to ${MAX_IMAGES} images at a time.`);
      return;
    }
    const optimized = await optimizeBatchImages(uris);
    setSelectedImages(prev => [...prev, ...optimized]);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputText('');
    setSelectedImages([]);
    setCurrentSessionId(null);
    setIsLoading(false);
  };

  const pickImage = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You have already selected ${MAX_IMAGES} images.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      const optimized = await optimizeBatchImages(uris);
      setSelectedImages(prev => [...prev, ...optimized]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSend = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
    };

    const newHistory = [userMsg, ...messages];
    setMessages(newHistory);
    
    setInputText('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const responseText = await sendChatRequest(newHistory);
      const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
      };
      setMessages(prev => [aiMsg, ...prev]);
    } catch (e) {
      console.error("Chat UI Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

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
        
        <View style={{maxWidth: '85%'}}>
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
            {item.images && item.images.length > 0 && (
                <View style={styles.messageImagesGrid}>
                    {item.images.map((imgUri, idx) => (
                        <Image 
                            key={idx} 
                            source={{ uri: imgUri }} 
                            style={[
                                styles.messageImage, 
                                item.images!.length > 1 && styles.messageImageMulti 
                            ]} 
                            contentFit="cover" 
                        />
                    ))}
                </View>
            )}
            {item.content ? (
                isUser ? (
                <Text style={styles.userText}>{item.content}</Text>
                ) : (
                <Markdown style={markdownStyles}>{item.content}</Markdown>
                )
            ) : null}
            </View>
        </View>
      </Animated.View>
    );
  };

  // Dimensions for padding logic
  // Tab Bar (~85) + Input Bar (~65) + Margin (~20) = ~170
  const VISUAL_BOTTOM_PADDING = TAB_BAR_HEIGHT + 85; 
  const VISUAL_TOP_PADDING = insets.top + 60;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Chat" 
        showSearch={false} 
        onSearch={() => {}}
        rightIcon="square.and.pencil" 
        onRightPress={handleNewChat}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent, 
          { 
            // Inverted List Logic:
            // paddingBottom => Visual TOP (Header spacing)
            // paddingTop => Visual BOTTOM (Input bar spacing)
            paddingBottom: VISUAL_TOP_PADDING, 
            paddingTop: VISUAL_BOTTOM_PADDING 
          }
        ]}
        inverted
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={40} color="#333" />
            </View>
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        }
      />

      {/* --- Unified Floating Input Bar --- */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={[styles.keyboardAvoidingView, { bottom: TAB_BAR_HEIGHT }]}
      >
        <View style={styles.floatingInputWrapper}>
            
            {/* 1. Image Previews */}
            {selectedImages.length > 0 && (
                <Animated.View entering={FadeInUp} layout={Layout.springify()} style={styles.previewListContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {selectedImages.map((uri, index) => (
                            <Animated.View key={index} entering={ZoomIn} exiting={ZoomOut} style={{ position: 'relative' }}>
                                <Image source={{ uri: uri }} style={styles.previewImage} />
                                <TouchableOpacity onPress={() => removeImage(index)} style={styles.removePreviewBtn}>
                                    <IconSymbol name="xmark.circle.fill" size={20} color="#fff" />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            {/* 2. Unified Glass Dock */}
            <View style={styles.glassDockOuter}>
                <BlurView intensity={80} tint="dark" style={styles.glassDockInner}>
                    
                    <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                        <IconSymbol name="plus" size={24} color="#ccc" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder={selectedImages.length > 0 ? `Ask about ${selectedImages.length} images...` : "Message Cactus..."}
                        placeholderTextColor="#888"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />

                    <TouchableOpacity 
                        onPress={handleSend} 
                        disabled={(!inputText && selectedImages.length === 0) || isLoading}
                        style={[
                            styles.sendButton,
                            (!inputText && selectedImages.length === 0) && styles.sendButtonDisabled
                        ]}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <IconSymbol name="arrow.up" size={20} color="#000" />
                        )}
                    </TouchableOpacity>

                </BlurView>
            </View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  listContent: { paddingHorizontal: 16, flexGrow: 1 },
  
  // Input Area Layout
  keyboardAvoidingView: { 
    position: 'absolute', 
    left: 0, 
    right: 0,
  },
  floatingInputWrapper: { 
    paddingHorizontal: 16, 
    paddingBottom: 10,
  },

  // Glass Dock Styles
  glassDockOuter: {
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassDockInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(30,30,30,0.6)', 
  },
  
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff', 
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.8,
  },

  // Preview
  previewListContainer: { marginBottom: 12, marginLeft: 4, maxHeight: 70 },
  previewImage: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  removePreviewBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#000', borderRadius: 10, borderWidth: 1, borderColor: '#333' },

  // Messages
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', transform: [{ scaleY: -1 }], opacity: 0.5, marginTop: 100 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { color: '#666', fontSize: 16, fontFamily: Fonts.rounded },
  
  messageRow: { marginVertical: 8, flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  
  bubble: { borderRadius: 20, padding: 12, width: '100%', overflow: 'hidden' },
  bubbleUser: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: '#262626', borderBottomLeftRadius: 4, marginLeft: 8 },
  
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  
  messageImagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  messageImage: { width: 200, height: 150, borderRadius: 12 },
  messageImageMulti: { width: 90, height: 90, borderRadius: 10 },
  
  aiAvatar: { marginBottom: 4 },
  avatarGradient: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

const markdownStyles = StyleSheet.create({
  body: { color: '#e1e1e1', fontSize: 16, lineHeight: 22 },
  code_inline: { backgroundColor: '#333', color: '#ffdd00', borderRadius: 4 },
  code_block: { backgroundColor: '#111', borderColor: '#333', borderRadius: 8, marginVertical: 4 },
});