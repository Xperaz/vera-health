import { useEffect, useRef } from "react";
import EventSource, {
  EventSourceListener,
  MessageEvent,
} from "react-native-sse";

import { STREAM_API_URL } from "../utils/constants";

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

function extractChunk(payload: any): string | null {
  if (payload == null) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.content === "string") {
    return payload.content;
  }

  if (payload.content?.content && typeof payload.content.content === "string") {
    return payload.content.content;
  }

  if (Array.isArray(payload.content)) {
    return payload.content.join("");
  }

  if (typeof payload.delta === "string") {
    return payload.delta;
  }

  return null;
}

function isDonePayload(payload: any) {
  if (payload == null) {
    return false;
  }

  const type =
    typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  return type === "done" || type === "completed";
}

function isErrorPayload(payload: any) {
  if (payload == null) {
    return false;
  }

  const type =
    typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  return type === "error" || type === "errorchunk";
}

function isSearchStepsComplete(payload: any) {
  if (payload == null || payload.type !== "NodeChunk") {
    return false;
  }

  const content = payload.content;
  if (
    content?.nodeName !== "SEARCH_STEPS" ||
    !Array.isArray(content?.content)
  ) {
    return false;
  }

  return content.content.every((step: any) => step?.isCompleted === true);
}
