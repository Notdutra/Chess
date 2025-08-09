// Service to interact with chess-api.com via WebSocket
// Allows configuration via env or config file

export interface ChessApiOptions {
  depth?: number;
  variants?: number;
  maxThinkingTime?: number;
  [key: string]: any;
}

export interface ChessApiResponse {
  type: 'move' | 'bestmove' | 'info';
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
  private onMoveCallback?: (move: string) => void;
  private onErrorCallback?: (err: any) => void;
  private loadingCallback?: (loading: boolean) => void;

  constructor(options: ChessApiOptions = {}) {
    // Use environment variables with fallbacks
    this.url =
      process.env.NEXT_PUBLIC_CHESS_API_URL || 'wss://chess-api.com/v1';
    this.maxReconnects = parseInt(
      process.env.NEXT_PUBLIC_CHESS_API_MAX_RECONNECTS || '3'
    );

    this.options = {
      depth: parseInt(process.env.NEXT_PUBLIC_CHESS_API_DEPTH || '1'),
      variants: parseInt(process.env.NEXT_PUBLIC_CHESS_API_VARIANTS || '1'),
      maxThinkingTime: parseInt(
        process.env.NEXT_PUBLIC_CHESS_API_MAX_THINKING_TIME || '5'
      ),
      ...options, // Allow override of env vars with explicit options
    };

    // ChessApi initialized silently
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        // Connected to chess-api.com
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: ChessApiResponse = JSON.parse(event.data);
          // Only log errors, not all responses

          // We want the final bestmove
          if (data.type === 'bestmove' && data.lan && this.onMoveCallback) {
            this.onMoveCallback(data.lan);
            if (this.loadingCallback) this.loadingCallback(false);
          }
        } catch (e) {
          console.error('Error parsing chess API response:', e);
          if (this.onErrorCallback) this.onErrorCallback(e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Chess API WebSocket error:', err);
        if (this.onErrorCallback) this.onErrorCallback(err);
        this.tryReconnect();
        reject(err);
      };

      this.ws.onclose = () => {
        // WebSocket closed, attempting reconnect
        this.tryReconnect();
      };
    });
  }

  tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnects) {
      this.reconnectAttempts++;
      // Silently reconnecting...
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      console.error('Failed to reconnect to chess-api.com after max attempts');
      if (this.onErrorCallback)
        this.onErrorCallback(
          'API unavailable after multiple reconnection attempts'
        );
    }
  }

  async requestMove(fen: string): Promise<string> {
    // Ensure we have a connection before proceeding
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connect();
      } catch (error) {
        throw new Error('Failed to establish WebSocket connection');
      }
    }

    return new Promise((resolve, reject) => {
      const message = {
        fen: fen,
        depth: this.options.depth || 1, // Use default 1 if not specified
        variants: this.options.variants || 1,
        maxThinkingTime: this.options.maxThinkingTime ?? 5, // Use default 5 if not set
      };

      // Set up response handler
      const handleResponse = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          // Handle final move response
          if (data.type === 'bestmove' || (data.bestmove && data.lan)) {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handleResponse);
            resolve(data.lan || data.bestmove);
          }
          // Handle error responses
          else if (data.type === 'error') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handleResponse);
            reject(new Error(data.text || 'Chess API error'));
          }
        } catch (error) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handleResponse);
          console.error('Error parsing chess API response:', error);
          reject(error);
        }
      };

      // Add timeout to prevent bot from getting stuck thinking
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handleResponse);
        reject(
          new Error(
            'Bot request timeout - chess-api.com took too long to respond'
          )
        );
      }, 20000); // 20 second timeout

      this.ws!.addEventListener('message', handleResponse);
      this.ws!.send(JSON.stringify(message));
    });
  }

  onMove(cb: (move: string) => void) {
    this.onMoveCallback = cb;
  }

  onError(cb: (err: any) => void) {
    this.onErrorCallback = cb;
  }

  onLoading(cb: (loading: boolean) => void) {
    this.loadingCallback = cb;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default ChessApi;
