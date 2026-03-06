import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import type { ConversionTimelineItem } from "@/src/lib/contracts";

import { formatDateTime, safeJson } from "./formatters";
import type { EventCard, ProgressStep } from "./progress";
import { eventToCard } from "./progress";

export function SeverityPill({ severity }: { severity?: EventCard["severity"] }) {
  const label =
    severity === "good" ? "OK" : severity === "warn" ? "ATTN" : severity === "bad" ? "ERR" : "INFO";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#333",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        marginLeft: 10,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

export function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: "#fff",
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export function StepRow({ step }: { step: ProgressStep }) {
  const isDone = step.state === "done";
  const isCurrent = step.state === "current";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: "#333",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
          backgroundColor: isDone ? "#fff" : "transparent",
        }}
      >
        {isDone ? (
          <Text style={{ fontSize: 12, fontWeight: "800" }}>✓</Text>
        ) : isCurrent ? (
          <PulseDot />
        ) : null}
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{
            fontWeight: "800",
            opacity: step.state === "pending" ? 0.7 : 1,
          }}
        >
          {step.title}
        </Text>
        <Text
          style={{
            marginTop: 4,
            opacity: 0.72,
            lineHeight: 20,
          }}
        >
          {step.subtitle}
        </Text>
      </View>
    </View>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          height: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#333",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${safe}%`,
            height: "100%",
            backgroundColor: "#fff",
          }}
        />
      </View>
      <Text style={{ marginTop: 8, opacity: 0.75 }}>{safe}% complete</Text>
    </View>
  );
}

export function TimelineCard({ event }: { event: ConversionTimelineItem }) {
  const [showDetails, setShowDetails] = useState(false);
  const card = eventToCard(event);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontWeight: "900", flex: 1 }}>{card.title}</Text>
        <SeverityPill severity={card.severity} />
      </View>

      <Text style={{ marginTop: 6, opacity: 0.78, lineHeight: 20 }}>{card.subtitle}</Text>

      <View style={{ marginTop: 10 }}>
        <Pressable onPress={() => setShowDetails((v) => !v)} style={{ alignSelf: "flex-start" }}>
          <Text style={{ opacity: 0.7, fontWeight: "700" }}>
            {showDetails ? "Hide details" : "Show details"}
          </Text>
        </Pressable>

        {showDetails ? (
          <View
            style={{
              marginTop: 10,
              borderTopWidth: 1,
              borderTopColor: "#333",
              paddingTop: 10,
            }}
          >
            {card.detail ? (
              <Text style={{ opacity: 0.75, marginBottom: 10 }}>{card.detail}</Text>
            ) : null}

            <Text style={{ fontSize: 12, opacity: 0.7 }}>Raw event</Text>
            <Text style={{ marginTop: 6, opacity: 0.85 }}>{safeJson(event)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MostRecentUpdateCard({ event }: { event: ConversionTimelineItem }) {
  const card = eventToCard(event);

  return (
    <View
      style={{
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "800" }}>Most recent update</Text>

      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontWeight: "900", flex: 1 }}>{card.title}</Text>
          <SeverityPill severity={card.severity} />
        </View>

        <Text style={{ marginTop: 6, opacity: 0.78, lineHeight: 20 }}>{card.subtitle}</Text>

        <Text style={{ marginTop: 10, opacity: 0.62, fontSize: 12 }}>
          {formatDateTime(event?.at)}
        </Text>
      </View>
    </View>
  );
}
