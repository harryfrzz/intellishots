import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <View style={styles.separator} />
      <Text style={styles.text}>This is a modal screen.</Text>
      <View style={styles.buttonContainer}>
         <Button title="Close" onPress={() => router.back()} />
      </View>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000', // Ensure background is set
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    color: '#ccc',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#333',
  },
  buttonContainer: {
    marginTop: 10,
  }
});
