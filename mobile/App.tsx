import { Slot } from 'expo-router';
import { AuthProvider } from './providers/AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}

