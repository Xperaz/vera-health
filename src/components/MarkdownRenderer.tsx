import { memo } from "react";
import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";

type MarkdownRendererProps = {
  content: string;
};

const markdownStyles = StyleSheet.create({
  body: {
    color: "#1f2933",
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  bullet_list: {
    marginVertical: 6,
  },
  ordered_list: {
    marginVertical: 6,
  },
  list_item: {
    marginVertical: 4,
  },
  code_inline: {
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: "Menlo",
  },
  fence: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    color: "#e2e8f0",
    fontFamily: "Menlo",
    padding: 12,
  },
  link: {
    color: "#2563eb",
  },
});

function MarkdownRendererComponent({ content }: MarkdownRendererProps) {
  if (!content.trim()) {
    return null;
  }

  return <Markdown style={markdownStyles}>{content.trim()}</Markdown>;
}

const MarkdownRenderer = memo(MarkdownRendererComponent);

export default MarkdownRenderer;
