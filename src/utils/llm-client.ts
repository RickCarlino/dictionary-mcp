interface LLMConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model?: string;
  apiBase?: string;
  timeout?: number;
  maxTokens?: number;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMClient {
  private config: LLMConfig;

  constructor() {
    const provider =
      (process.env.LLM_PROVIDER as "openai" | "anthropic") || "openai";
    const apiKey =
      process.env[
        provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"
      ] || "";

    this.config = {
      provider,
      apiKey,
      model:
        process.env[
          provider === "openai" ? "OPENAI_MODEL" : "ANTHROPIC_MODEL"
        ] ||
        (provider === "openai"
          ? "gpt-4-turbo-preview"
          : "claude-3-opus-20240229"),
      apiBase:
        process.env[
          provider === "openai" ? "OPENAI_API_BASE" : "ANTHROPIC_API_BASE"
        ] ||
        (provider === "openai"
          ? "https://api.openai.com/v1"
          : "https://api.anthropic.com"),
      timeout: parseInt(process.env.LLM_TIMEOUT || "30000"),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "500"),
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async complete(prompt: string): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        `${this.config.provider.toUpperCase()}_API_KEY not configured`,
      );
    }

    const completionHandlers = {
      openai: () => this.completeOpenAI(prompt),
      anthropic: () => this.completeAnthropic(prompt),
    };

    return completionHandlers[this.config.provider]();
  }

  private async completeOpenAI(prompt: string): Promise<LLMResponse> {
    const response = await fetch(`${this.config.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that identifies technical terms and jargon in text. Return ONLY a JSON array of strings.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    return {
      content: data.choices[0]!.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async completeAnthropic(prompt: string): Promise<LLMResponse> {
    const response = await fetch(`${this.config.apiBase}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        system:
          "You are a helpful assistant that identifies technical terms and jargon in text. Return ONLY a JSON array of strings.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
      usage?: {
        input_tokens: number;
        output_tokens: number;
      };
    };
    return {
      content: data.content[0]!.text,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    };
  }
}
