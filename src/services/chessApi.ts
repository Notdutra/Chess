// Service to interact with chess-api.com via WebSocket
// Adds a small "suppressConsole" option to avoid spamming the dev overlay
import logger from "../utils/logger";

export interface ChessApiOptions {
  depth?: number;
  variants?: number;
  maxThinkingTime?: number;
  // When true, internal console.error calls are suppressed. Use onError/onLoading to observe problems.
  suppressConsole?: boolean;
  [key: string]: unknown;
}

export interface ChessApiResponse {
  type: "move" | "bestmove" | "info";
  lan?: string; // Long algebraic notation like "e2e4"
  from?: string;
  to?: string;
  promotion?: string;
  eval?: number;
  depth?: number;
  text?: string;
  winChance?: number;
  mate?: number | null;
  san?: string; // Short algebraic notation
  isCapture?: boolean;
  isCastling?: boolean;
  isPromotion?: boolean;
  taskId?: string;
}

export class ChessApi {
  private ws: WebSocket | null = null;
  private url: string;
  private options: ChessApiOptions;
  private reconnectAttempts = 0;
  private maxReconnects: number;
  // Shared promise for an in-flight connect() to avoid duplicate connects
  private connectingPromise: Promise<void> | null = null;
  // Backoff parameters (ms)
  private reconnectBaseDelay = 500; // base delay
  private reconnectMaxDelay = 30000; // cap delay
  private onMoveCallback?: (move: string) => void;
  private onErrorCallback?: (err: unknown) => void;
  private loadingCallback?: (loading: boolean) => void;
  private manualClose = false;

  constructor(options: ChessApiOptions = {}) {
    // Use environment variables with fallbacks
    this.url = process.env.NEXT_PUBLIC_CHESS_API_URL || "wss://chess-api.com/v1";
    this.maxReconnects = parseInt(process.env.NEXT_PUBLIC_CHESS_API_MAX_RECONNECTS || "3");

    this.options = {
      depth: parseInt(process.env.NEXT_PUBLIC_CHESS_API_DEPTH || "1"),
      variants: parseInt(process.env.NEXT_PUBLIC_CHESS_API_VARIANTS || "1"),
      maxThinkingTime: parseInt(process.env.NEXT_PUBLIC_CHESS_API_MAX_THINKING_TIME || "5"),
      suppressConsole: true,
      ...options, // Allow override of env vars with explicit options
    };

    // ChessApi initialized silently
  }

  // no-op: use imported logger at module top

  connect(): Promise<void> {
    // If a connect is already in progress, return that promise.
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = new Promise((resolve, reject) => {
      try {
        this.manualClose = false;
        this.ws = new WebSocket(this.url);
        const ws = this.ws;

        let opened = false;
        const connectTimeout = window.setTimeout(() => {
          if (!opened) {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
            this.ws = null;
            this.connectingPromise = null;
            reject(new Error("WebSocket connect timeout"));
          }
        }, 5000);

        ws.onopen = () => {
          opened = true;
          clearTimeout(connectTimeout);
          // Connected to chess-api.com
          this.reconnectAttempts = 0;
          this.connectingPromise = null;
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data: ChessApiResponse = JSON.parse(event.data);
            // We want the final bestmove
            if (data.type === "bestmove" && data.lan && this.onMoveCallback) {
              this.onMoveCallback(data.lan);
              if (this.loadingCallback) this.loadingCallback(false);
            }
          } catch (e) {
            if (!this.options.suppressConsole) {
              logger.error("Error parsing chess API response:", e);
            }
            if (this.onErrorCallback) {
              this.onErrorCallback(e);
            }
          }
        };

        ws.onerror = (err) => {
          // If error occurs before open, reject the connect promise. Otherwise notify and attempt reconnect.
          if (!this.options.suppressConsole) {
            logger.error("Chess API WebSocket error:", err);
          }
          if (!opened) {
            clearTimeout(connectTimeout);
            this.ws = null;
            this.connectingPromise = null;
            if (this.onErrorCallback) this.onErrorCallback(err);
            reject(err);
          } else {
            if (this.onErrorCallback) this.onErrorCallback(err);
            this.tryReconnect();
          }
        };

        ws.onclose = () => {
          // Only attempt reconnect if we didn't intentionally close
          if (!opened) {
            // closed before open; ensure connect promise rejects if not already
            try {
              clearTimeout(connectTimeout);
            } catch {}
            this.connectingPromise = null;
          }
          if (!this.manualClose) {
            this.tryReconnect();
          }
        };
      } catch (err) {
        this.ws = null;
        this.connectingPromise = null;
        reject(err);
      }
    });

    return this.connectingPromise;
  }

  tryReconnect() {
    if (this.manualClose) return;

    if (this.reconnectAttempts >= this.maxReconnects) {
      if (!this.options.suppressConsole) {
        logger.error("Failed to reconnect to chess-api.com after max attempts");
      }
      if (this.onErrorCallback) {
        this.onErrorCallback("API unavailable after multiple reconnection attempts");
      }
      return;
    }

    // Increment attempt count and compute exponential backoff with jitter
    this.reconnectAttempts++;
    const attempt = this.reconnectAttempts;
    // exponential backoff: base * 2^(attempt-1)
    const exp = this.reconnectBaseDelay * Math.pow(2, attempt - 1);
    // add jitter +/- 50%
    const jitter = exp * 0.5 * (Math.random() - 0.5) * 2;
    const delay = Math.min(this.reconnectMaxDelay, Math.floor(exp + jitter));

    if (!this.options.suppressConsole) {
      logger.info(`ChessApi: reconnect attempt ${attempt} in ${delay}ms`);
    }

    setTimeout(() => {
      // Only try to connect if not manually closed
      if (this.manualClose) return;
      this.connect().catch(() => {});
    }, delay);
  }

  async requestMove(fen: string): Promise<string> {
    // Ensure we have a connection before proceeding
    const message = {
      fen: fen,
      depth: this.options.depth || 1, // Use default 1 if not specified
      variants: this.options.variants || 1,
      maxThinkingTime: this.options.maxThinkingTime ?? 5, // Use default 5 if not set
    };

    // Try websocket path first
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connect();
      }

      return await new Promise<string>((resolve, reject) => {
        // Set up response handler
        const handleResponse = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            // Handle final move response
            if (data.type === "bestmove" || (data.bestmove && data.lan)) {
              clearTimeout(timeout);
              this.ws?.removeEventListener("message", handleResponse);
              resolve(data.lan || data.bestmove);
            }
            // Handle error responses
            else if (data.type === "error") {
              clearTimeout(timeout);
              this.ws?.removeEventListener("message", handleResponse);
              reject(new Error(data.text || "Chess API error"));
            }
          } catch (error) {
            clearTimeout(timeout);
            this.ws?.removeEventListener("message", handleResponse);
            if (!this.options.suppressConsole) {
              logger.error("Error parsing chess API response:", error);
            }
            reject(error);
          }
        };

        // Add timeout to prevent bot from getting stuck thinking
        const timeout = setTimeout(() => {
          this.ws?.removeEventListener("message", handleResponse);
          reject(new Error("Bot request timeout - chess-api.com took too long to respond"));
        }, 20000); // 20 second timeout

        this.ws!.addEventListener("message", handleResponse);
        try {
          this.ws!.send(JSON.stringify(message));
        } catch (err) {
          clearTimeout(timeout);
          this.ws?.removeEventListener("message", handleResponse);
          reject(err);
        }
      });
    } catch {
      // Fallback: try HTTP POST to the same host (replace wss:// or ws:// with https://)
      try {
        const httpUrl = this.url.replace(/^wss?:\/\//, "https://");
        const resp = await fetch(httpUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
        const data = await resp.json();
        if (data && (data.lan || data.bestmove)) {
          return data.lan || data.bestmove;
        }
        throw new Error("HTTP fallback did not return a move");
      } catch (httpErr) {
        if (!this.options.suppressConsole) logger.error("HTTP fallback failed:", httpErr);
        throw new Error(`Failed to obtain move via WebSocket and HTTP fallback: ${httpErr}`);
      }
    }
  }

  onMove(cb: (move: string) => void) {
    this.onMoveCallback = cb;
  }

  onError(cb: (err: unknown) => void) {
    this.onErrorCallback = cb;
  }

  onLoading(cb: (loading: boolean) => void) {
    this.loadingCallback = cb;
  }

  disconnect() {
    this.manualClose = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }
}

export default ChessApi;
