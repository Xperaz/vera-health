import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type SearchProgressProps = {
  visible: boolean;
  label?: string;
};

export default function SearchProgress({
  visible,
  label = "Generating answer...",
}: SearchProgressProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#2563eb" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    marginLeft: 8,
    fontSize: 14,
    color: "#374151",
  },
});
