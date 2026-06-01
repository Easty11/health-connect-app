import { SafeAreaView, StyleSheet, StatusBar, useColorScheme } from 'react-native';
import SyncScreen from './src/SyncScreen';

export default function App() {
  const dark = useColorScheme() === 'dark';
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0f0f14' : '#f9fafb' }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <SyncScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
