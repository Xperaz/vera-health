import { useMemo } from "react";
import { View } from "react-native";

import { DEFAULT_SECTION_TITLE, TAG_TITLE_OVERRIDES } from "../utils/constants";
import CollapsibleSection from "./CollapsibleSection";
import MarkdownRenderer from "./MarkdownRenderer";

type ParsedSection = {
  id: string;
  title: string;
  content: string;
  tagName: string | null;
  isPending: boolean;
};

type StreamingTextProps = {
  content: string;
  isStreaming: boolean;
};

export default function StreamingText({
  content,
  isStreaming,
}: StreamingTextProps) {
  const sections = useMemo(() => parseSections(content), [content]);

  if (!sections.length) {
    return null;
  }

  const lastIndex = sections.length - 1;

  return (
    <View>
      {sections.map((section, index) => (
        <CollapsibleSection
          key={section.id}
          title={section.title}
          initialExpanded={index === 0}
          subtitle={
            section.isPending || (isStreaming && index === lastIndex)
              ? "Streaming..."
              : null
          }
        >
          <MarkdownRenderer content={section.content} />
        </CollapsibleSection>
      ))}
    </View>
  );
}

// This function parses the raw streamed text into sections based on custom tags.
function parseSections(raw: string): ParsedSection[] {
  if (!raw) {
    return [];
  }

  const sections: ParsedSection[] = [];
  const counters: Record<string, number> = {};
  let generalCount = 0;
  let lastIndex = 0;
  let lastGeneral: ParsedSection | null = null;
  const stack: { tag: string; section: ParsedSection }[] = [];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)>/g;
  let match: RegExpExecArray | null;

  const appendGeneral = (chunk: string) => {
    if (!chunk) {
      return;
    }

    if (lastGeneral) {
      lastGeneral.content += chunk;
      return;
    }

    generalCount += 1;
    const title =
      generalCount === 1
        ? DEFAULT_SECTION_TITLE
        : `${DEFAULT_SECTION_TITLE} ${generalCount}`;

    const section: ParsedSection = {
      id: `general-${generalCount}-${sections.length}`,
      title,
      content: chunk,
      tagName: null,
      isPending: false,
    };

    sections.push(section);
    lastGeneral = section;
  };

  while ((match = tagRegex.exec(raw))) {
    const preceding = raw.slice(lastIndex, match.index);

    if (preceding) {
      if (stack.length) {
        stack[stack.length - 1].section.content += preceding;
      } else {
        appendGeneral(preceding);
      }
    }

    const fullMatch = match[0];
    const tagName = match[1];
    const isClosing = fullMatch.startsWith("</");

    if (isClosing) {
      if (stack.length && stack[stack.length - 1].tag === tagName) {
        const { section } = stack.pop()!;
        section.isPending = false;
        lastGeneral = null;
      } else {
        appendGeneral(fullMatch);
      }
    } else {
      lastGeneral = null;
      const count = (counters[tagName] = (counters[tagName] ?? 0) + 1);
      const section: ParsedSection = {
        id: `${tagName}-${count}-${sections.length}`,
        title: formatTagTitle(tagName, count),
        content: "",
        tagName,
        isPending: true,
      };

      sections.push(section);
      stack.push({ tag: tagName, section });
    }

    lastIndex = tagRegex.lastIndex;
  }

  const trailing = raw.slice(lastIndex);

  if (trailing) {
    if (stack.length) {
      stack[stack.length - 1].section.content += trailing;
    } else {
      appendGeneral(trailing);
    }
  }

  // Mark any still-open sections as pending so callers can show progress UI.
  stack.forEach(({ section }) => {
    section.isPending = true;
  });

  // Ensure markdown renderer receives trimmed text for cleaner output.
  return sections.map((section) => ({
    ...section,
    content: section.content.trim(),
  }));
}

function formatTagTitle(tagName: string, ordinal: number) {
  const normalized = tagName.toLowerCase();
  const baseTitle =
    TAG_TITLE_OVERRIDES[normalized] ??
    normalized
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return ordinal > 1 ? `${baseTitle} ${ordinal}` : baseTitle;
}
