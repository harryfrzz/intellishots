import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { CustomHeader } from '@/components/CustomHeader';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <CustomHeader title="Chat" />
      <View style={styles.content}>
        <Text style={styles.text}>Chat Interface Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
});
