"use client"

import { useState, useEffect, useCallback } from "react"
import {
  fetchBookingData,
  saveBookingData,
  updateBookingData,
  deleteBookingData,
  checkBookingDataExists,
  type BookingData,
} from "@/services/booking-data-service"

export function useBookingData(hospitalId: string, date: string) {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch booking data
  const fetchData = useCallback(async () => {
    if (!hospitalId || !date) return

    setLoading(true)
    setError(null)

    try {
      const data = await fetchBookingData(hospitalId, date)
      setBookingData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch booking data")
    } finally {
      setLoading(false)
    }
  }, [hospitalId, date])

  // Save booking data
  const saveData = useCallback(
    async (data: Omit<BookingData, "createdAt" | "updatedAt">) => {
      if (!hospitalId || !date) return { success: false, error: "Hospital ID and date required" }

      setSaving(true)
      setError(null)

      try {
        await saveBookingData(hospitalId, date, data)
        setBookingData({ ...data, createdAt: new Date(), updatedAt: new Date() })
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save booking data"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setSaving(false)
      }
    },
    [hospitalId, date],
  )

  // Update booking data
  const updateData = useCallback(
    async (data: Partial<Omit<BookingData, "createdAt" | "updatedAt">>) => {
      if (!hospitalId || !date) return { success: false, error: "Hospital ID and date required" }

      setSaving(true)
      setError(null)

      try {
        await updateBookingData(hospitalId, date, data)
        // Refresh data after update
        await fetchData()
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update booking data"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setSaving(false)
      }
    },
    [hospitalId, date, fetchData],
  )

  // Delete booking data
  const deleteData = useCallback(async () => {
    if (!hospitalId || !date) return { success: false, error: "Hospital ID and date required" }

    setSaving(true)
    setError(null)

    try {
      await deleteBookingData(hospitalId, date)
      setBookingData(null)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete booking data"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setSaving(false)
    }
  }, [hospitalId, date])

  // Check if data exists
  const checkExists = useCallback(async () => {
    if (!hospitalId || !date) return false

    try {
      return await checkBookingDataExists(hospitalId, date)
    } catch (err) {
      console.error("Error checking booking data existence:", err)
      return false
    }
  }, [hospitalId, date])

  // Refresh data
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    bookingData,
    loading,
    error,
    saving,
    saveData,
    updateData,
    deleteData,
    checkExists,
    refresh,
    // Computed properties
    hasData: bookingData !== null,
  }
}
