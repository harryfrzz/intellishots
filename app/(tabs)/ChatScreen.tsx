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
  Image as RNImage 
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; // 1. Import Manipulator
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { saveChatSession } from '@/services/Storage'; // Import the save function

// Import from the service
import { sendChatRequest, ChatMessage, initLocalAI } from '@/services/LocalAI';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const handleNewChat = async () => {
    // 1. If there are messages, save them first
    if (messages.length > 0) {
        setIsLoading(true); // Show loader briefly
        await saveChatSession(messages);
    }
    
    // 2. Reset the screen state
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(false);
  };

  const TAB_BAR_HEIGHT = 85; 

  // Initialize model on mount
  useEffect(() => {
    initLocalAI().catch(e => console.log("Background init failed", e));
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1, // Get original first, we will compress manually
      });

      if (!result.canceled) {
        const originalUri = result.assets[0].uri;
        
        // 2. Compress and Resize immediately
        // Resizing to 1024px width is standard for VLM efficiency
        const manipulated = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 512 } }], 
          { compress: 0.7, format: ImageManipulator.SaveFormat.PNG }
        );

        setSelectedImage(manipulated.uri);
      }
    } catch (e) {
      console.error("Error picking/compressing image:", e);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    // 1. Create User Message object
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      imageUri: selectedImage || undefined,
    };

    // 2. Update UI immediately
    const newHistory = [userMsg, ...messages]; // Newest first
    setMessages(newHistory);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 3. Call Real VLM API
      const responseText = await sendChatRequest(newHistory);

      const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
      };

      setMessages(prev => [aiMsg, ...prev]);
    } catch (e) {
      console.error("Chat UI Error:", e);
      const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages(prev => [errorMsg, ...prev]);
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

  return (
    <View style={styles.container}>
     <CustomHeader 
        title="Chat" 
        showSearch={false} 
        onSearch={() => {}}
        rightIcon="square.and.pencil" // SF Symbol for New Chat
        onRightPress={handleNewChat}
      />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: insets.top + 80, paddingBottom: TAB_BAR_HEIGHT + 80 }
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

      {/* Floating Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.keyboardAvoidingView}
      >
        <View style={[styles.floatingInputWrapper, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}>
            
            {/* Image Preview */}
            {selectedImage && (
                <Animated.View entering={FadeInUp} style={styles.previewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removePreviewBtn}>
                        <IconSymbol name="xmark.circle.fill" size={20} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            )}

            <View style={styles.inputRow}>
                {/* Attach Button */}
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                    <BlurView intensity={80} tint="dark" style={styles.glassButton}>
                        <IconSymbol name="plus" size={24} color="#fff" />
                    </BlurView>
                </TouchableOpacity>

                {/* Text Input */}
                <BlurView intensity={80} tint="dark" style={styles.glassInputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Message..."
                        placeholderTextColor="#aaa"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                </BlurView>

                {/* Send Button */}
                <TouchableOpacity 
                    onPress={handleSend} 
                    disabled={(!inputText && !selectedImage) || isLoading}
                    style={[
                        styles.sendButton,
                        (!inputText && !selectedImage) && styles.sendButtonDisabled
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#000" size="small" />
                    ) : (
                        <IconSymbol name="arrow.up" size={20} color="#000" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatingInputWrapper: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8, 
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  glassInputContainer: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff', 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.8,
  },
  previewContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    marginLeft: 52, 
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  removePreviewBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    transform: [{ scaleY: -1 }], 
    opacity: 0.5,
    marginTop: 100,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontFamily: Fonts.rounded,
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