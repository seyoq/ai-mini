"use client"

import { useState, useEffect, useCallback } from "react"
import {
  fetchReservationSettingsFromFirestore,
  saveReservationSettingsToFirestore,
  updateReservationSettings,
  deleteReservationSettings,
  checkReservationSettingsExists,
  validateReservationSettings,
  type ReservationSettings,
} from "@/services/reservation-service"

export function useReservationSettings(hospitalId: string) {
  const [settings, setSettings] = useState<ReservationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!hospitalId) return

    setLoading(true)
    setError(null)

    try {
      const data = await fetchReservationSettingsFromFirestore(hospitalId)
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch settings")
    } finally {
      setLoading(false)
    }
  }, [hospitalId])

  // Save settings
  const saveSettings = useCallback(
    async (data: ReservationSettings) => {
      if (!hospitalId) return { success: false, error: "Hospital ID required" }

      // Validate data
      const validation = validateReservationSettings(data)
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(", ") }
      }

      setSaving(true)
      setError(null)

      try {
        await saveReservationSettingsToFirestore(hospitalId, data)
        setSettings(data)
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save settings"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setSaving(false)
      }
    },
    [hospitalId],
  )

  // Update settings
  const updateSettings = useCallback(
    async (data: Partial<ReservationSettings>) => {
      if (!hospitalId) return { success: false, error: "Hospital ID required" }

      setSaving(true)
      setError(null)

      try {
        await updateReservationSettings(hospitalId, data)
        // Refresh settings after update
        await fetchSettings()
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update settings"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setSaving(false)
      }
    },
    [hospitalId, fetchSettings],
  )

  // Delete settings
  const deleteSettings = useCallback(async () => {
    if (!hospitalId) return { success: false, error: "Hospital ID required" }

    setSaving(true)
    setError(null)

    try {
      await deleteReservationSettings(hospitalId)
      setSettings(null)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete settings"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setSaving(false)
    }
  }, [hospitalId])

  // Check if settings exist
  const checkExists = useCallback(async () => {
    if (!hospitalId) return false

    try {
      return await checkReservationSettingsExists(hospitalId)
    } catch (err) {
      console.error("Error checking settings existence:", err)
      return false
    }
  }, [hospitalId])

  // Refresh settings
  const refresh = useCallback(() => {
    fetchSettings()
  }, [fetchSettings])

  // Initial fetch
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    saving,
    saveSettings,
    updateSettings,
    deleteSettings,
    checkExists,
    refresh,
    // Computed properties
    hasSettings: settings !== null,
    isValid: settings ? validateReservationSettings(settings).isValid : false,
  }
}
