import { useEffect, useRef } from "react";
import EventSource, {
  EventSourceListener,
  MessageEvent,
} from "react-native-sse";

import { STREAM_API_URL } from "../utils/constants";

// The stream can emit different JSON shapes, so I expose raw payloads as `unknown`
type SSEHandlers = {
  onChunk: (chunk: string, payload: unknown) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
};

type UseSSEStreamConfig = SSEHandlers & {
  prompt: string | null;
  enabled?: boolean;
  requestId?: number;
};

export function useSSEStream({
  prompt,
  enabled = true,
  requestId = 0,
  onChunk,
  onError,
  onDone,
}: UseSSEStreamConfig) {
  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<SSEHandlers>({ onChunk, onError, onDone });

  useEffect(() => {
    handlersRef.current = { onChunk, onError, onDone };
  }, [onChunk, onError, onDone]);

  useEffect(() => {
    if (!prompt || !enabled) {
      return;
    }

    const url = `${STREAM_API_URL}${encodeURIComponent(prompt)}`;
    const es = new EventSource(url, {
      headers: {
        Accept: "text/event-stream",
      },
    });

    esRef.current = es;

    const handleMessage: EventSourceListener<never, "message"> = (event) => {
      const messageEvent = event as MessageEvent;

      if (!messageEvent.data) {
        return;
      }

      if (messageEvent.data === "[DONE]") {
        handlersRef.current.onDone?.();
        es.close();
        esRef.current = null;
        return;
      }

      try {
        const parsed = JSON.parse(messageEvent.data);
        const chunk = extractChunk(parsed);

        if (chunk) {
          handlersRef.current.onChunk(chunk, parsed);
        }

        if (isDonePayload(parsed)) {
          handlersRef.current.onDone?.();
          es.close();
          esRef.current = null;
          return;
        }

        if (isSearchStepsComplete(parsed)) {
          handlersRef.current.onDone?.();
          es.close();
          esRef.current = null;
        }

        if (isErrorPayload(parsed)) {
          handlersRef.current.onError?.(parsed);
        }
      } catch (error) {
        handlersRef.current.onError?.(error);
      }
    };

    const handleError: EventSourceListener = (event) => {
      handlersRef.current.onError?.(event);
      es.close();
      esRef.current = null;
    };

    es.addEventListener("message", handleMessage);
    es.addEventListener("error", handleError);

    return () => {
      es.removeEventListener("message", handleMessage);
      es.removeEventListener("error", handleError);
      es.close();
      if (esRef.current === es) {
        esRef.current = null;
      }
    };
  }, [prompt, enabled, requestId]);
}

function extractChunk(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const content = payload.content;
  const delta = payload.delta;

  if (typeof content === "string") {
    return content;
  }

  if (isStringArray(content)) {
    return content.join("");
  }

  if (isRecord(content) && typeof content.content === "string") {
    return content.content;
  }

  if (typeof delta === "string") {
    return delta;
  }

  return null;
}

function isDonePayload(payload: unknown): boolean {
  if (!isRecord(payload) || typeof payload.type !== "string") {
    return false;
  }

  const type = payload.type.toLowerCase();
  return type === "done" || type === "completed";
}

function isErrorPayload(payload: unknown): boolean {
  if (!isRecord(payload) || typeof payload.type !== "string") {
    return false;
  }

  const type = payload.type.toLowerCase();
  return type === "error" || type === "errorchunk";
}

function isSearchStepsComplete(payload: unknown): boolean {
  if (!isRecord(payload) || payload.type !== "NodeChunk") {
    return false;
  }

  const content = payload.content;
  if (!isRecord(content) || content.nodeName !== "SEARCH_STEPS") {
    return false;
  }

  if (!Array.isArray(content.content)) {
    return false;
  }

  return content.content.every(
    (step) => isRecord(step) && step.isCompleted === true
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
