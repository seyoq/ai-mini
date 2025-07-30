"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: Date
}

export interface UseChatOptions {
  api?: string
  initialMessages?: Message[]
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
}

export interface UseChatReturn {
  messages: Message[]
  input: string
  isLoading: boolean
  error: Error | null
  append: (message: Omit<Message, "id" | "createdAt">) => Promise<void>
  setMessages: (messages: Message[]) => void
  setInput: (input: string) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  reload: () => void
  stop: () => void
}

export function useChat({
  api = "/api/chat",
  initialMessages = [],
  onFinish,
  onError,
}: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateId = () => Math.random().toString(36).substring(2, 15)

  const append = useCallback(
    async (message: Omit<Message, "id" | "createdAt">) => {
      const newMessage: Message = {
        ...message,
        id: generateId(),
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, newMessage])
      setIsLoading(true)
      setError(null)

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, newMessage],
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const decoder = new TextDecoder()
        let assistantMessage = ""
        const assistantMessageId = generateId()

        // Add initial assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
          },
        ])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") {
                break
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.choices?.[0]?.delta?.content) {
                  assistantMessage += parsed.choices[0].delta.content
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: assistantMessage } : msg)),
                  )
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        const finalMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: assistantMessage,
          createdAt: new Date(),
        }

        onFinish?.(finalMessage)
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was aborted, don't treat as error
          return
        }

        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [api, messages, onFinish, onError],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      append({ role: "user", content: input })
      setInput("")
    },
    [input, isLoading, append],
  )

  const reload = useCallback(() => {
    if (messages.length === 0) return

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      // Remove messages after the last user message
      const lastUserIndex = messages.findIndex((m) => m.id === lastUserMessage.id)
      setMessages(messages.slice(0, lastUserIndex + 1))
      append({ role: "user", content: lastUserMessage.content })
    }
  }, [messages, append])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  return {
    messages,
    input,
    isLoading,
    error,
    append,
    setMessages,
    setInput,
    handleInputChange,
    handleSubmit,
    reload,
    stop,
  }
}
