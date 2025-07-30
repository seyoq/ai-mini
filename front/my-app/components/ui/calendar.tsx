"use client"
// 파일 상단에 추가
import { ko } from "date-fns/locale"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
    // selected={new Date()}
    onDayClick={(date) => console.log(date)}
    fromDate={new Date(2023, 0, 1)}
    toDate={new Date(2029, 11, 31)}
    showOutsideDays={false}
    locale={ko}
    numberOfMonths={1}
    
    
    classNames={{
      months: "flex flex-wrap justify-center gap-4",
      month: "space-y-2",
      caption: "flex justify-between items-center px-2",
      caption_label: "text-sm font-medium",
      nav: "flex items-center gap-1",
      nav_button: "p-1 rounded hover:bg-accent",
      table: "w-full table-fixed border-collapse",
      head_row: "flex",
      head_cell: "w-10 text-xs text-center text-muted-foreground",
      row: "flex w-full justify-between",
      cell: "w-10 h-10 flex items-center justify-center text-sm",
      day: "w-9 h-9 p-0 text-center",
      day_selected: cn(
        "bg-primary text-white rounded",
        "[&.rdp-day_today]:border-red-500 [&.rdp-day_today]:text-red-500"
      ),
      day_outside: "text-muted-foreground opacity-50",
    }}
    
    
     
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
