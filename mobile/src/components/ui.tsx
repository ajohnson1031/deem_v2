import React from "react";
import { ActivityIndicator, Pressable, Text, View, type ViewProps } from "react-native";

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{title}</Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 6,
            opacity: 0.75,
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionCard({ children, style }: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: "#333",
          borderRadius: 16,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewProps["style"];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: "#fff",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator /> : <Text style={{ fontWeight: "900" }}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        alignItems: "center",
        paddingVertical: 12,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ opacity: 0.7 }}>{label}</Text>
    </Pressable>
  );
}
