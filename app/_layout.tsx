import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
// import Purchases from 'react-native-purchases'; // RevenueCat import
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize RevenueCat globally for the app
//   useEffect(() => {
//     Purchases.configure({ apiKey: 'sk_gmTUDPSzndtRKoVUpOCjBAmDHOrmq' }); // Replace with your RevenueCat API key
//   }, []);

  if (!loaded) {
    return null;
  }

  return (
    <Stack>
      {/* The tabs layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pages/trans-plot" options={{ headerShown: false }} />
      <Stack.Screen name="pages/Tasks" options={{ headerShown: false }} />
      <Stack.Screen name="pages/UploadDocuments" options={{ headerShown: false }} />
      <Stack.Screen name="pages/ViewDocuments" options={{ headerShown: false }} />
      <Stack.Screen name="pages/LoginForm" options={{ headerShown: false }} />
      <Stack.Screen name="pages/RegistrationForm" options={{ headerShown: false }} />
      <Stack.Screen name="pages/InventoryForm" options={{ headerShown: false }} />
      <Stack.Screen name="pages/TransactionForm" options={{ headerShown: false }} />
      <Stack.Screen name="pages/MyProfile" options={{ headerShown: false }} />
      <Stack.Screen name="pages/ChatInterface" options={{ headerShown: false }} />
    </Stack>
  );
}
