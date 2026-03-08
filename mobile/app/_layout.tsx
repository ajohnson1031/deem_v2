import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "../src/state/auth";

function Gate() {
  const { booting, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (booting) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)");
      return;
    }

    if (token && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [booting, token, segments, router]);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
