import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SearchProgress from "../components/SearchProgress";
import StreamingText from "../components/StreamingText";
import { useSSEStream } from "../hooks/useSSEStream";

export default function Index() {
  const [questionInput, setQuestionInput] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(
    null
  );
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  const handleStreamChunk = useCallback((chunk: string) => {
    setAnswer((prev) => prev + chunk);
  }, []);

  const handleStreamError = useCallback((error: unknown) => {
    console.warn("SSE stream error", error);
    setIsStreaming(false);
    setStreamError(
      "We couldn't finish streaming the answer. Please try again."
    );
  }, []);

  const handleStreamComplete = useCallback(() => {
    setIsStreaming(false);
  }, []);

  useSSEStream({
    prompt: submittedQuestion,
    requestId,
    enabled: Boolean(submittedQuestion) && isStreaming,
    onChunk: handleStreamChunk,
    onError: handleStreamError,
    onDone: handleStreamComplete,
  });

  const handleSend = useCallback(() => {
    const trimmed = questionInput.trim();

    if (!trimmed) {
      return;
    }

    Keyboard.dismiss();
    setSubmittedQuestion(trimmed);
    setQuestionInput(trimmed);
    setAnswer("");
    setIsStreaming(true);
    setStreamError(null);
    setRequestId((id) => id + 1);
  }, [questionInput]);

  const disableSend = isStreaming || !questionInput.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Vera Health Assistant</Text>
          <Text style={styles.subheading}>
            Ask a clinical question and watch the answer stream in with
            structured guidance.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Your Question</Text>
            <TextInput
              style={styles.input}
              placeholder="What clinical guidance do you need today?"
              placeholderTextColor="#9ca3af"
              multiline
              value={questionInput}
              onChangeText={setQuestionInput}
              editable={!isStreaming}
              accessibilityLabel="Question input"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                disableSend && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={disableSend}
              accessibilityRole="button"
              accessibilityState={{ disabled: disableSend }}
            >
              <Text style={styles.sendButtonText}>
                {isStreaming ? "Streaming..." : "Ask"}
              </Text>
            </TouchableOpacity>
          </View>

          {submittedQuestion ? (
            <View style={styles.responseCard}>
              <Text style={styles.label}>Question</Text>
              <Text style={styles.questionCopy}>{submittedQuestion}</Text>

              <SearchProgress visible={isStreaming} />

              {answer ? (
                <View style={styles.answerContainer}>
                  <StreamingText content={answer} isStreaming={isStreaming} />
                </View>
              ) : !isStreaming ? (
                <Text style={styles.placeholder}>
                  Your answer will appear here.
                </Text>
              ) : null}

              {streamError ? (
                <Text style={styles.errorText}>{streamError}</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
  },
  subheading: {
    fontSize: 15,
    color: "#475569",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#64748b",
    textTransform: "uppercase",
  },
  input: {
    marginTop: 12,
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  sendButton: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  sendButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  responseCard: {
    marginTop: 28,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  questionCopy: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: "#0f172a",
  },
  answerContainer: {
    marginTop: 16,
  },
  placeholder: {
    marginTop: 16,
    fontSize: 14,
    color: "#94a3b8",
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: "#b91c1c",
  },
});
