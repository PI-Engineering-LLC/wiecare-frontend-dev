import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Video, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';

const categoryColors = {
  safety: 'bg-rose-500',
  operations: 'bg-blue-500',
  maintenance: 'bg-amber-500',
  business: 'bg-violet-500',
  technical: 'bg-cyan-500',
  certification: 'bg-emerald-500',
};

const categoryBg = {
  safety: 'bg-rose-50 border-rose-200 text-rose-700',
  operations: 'bg-blue-50 border-blue-200 text-blue-700',
  maintenance: 'bg-amber-50 border-amber-200 text-amber-700',
  business: 'bg-violet-50 border-violet-200 text-violet-700',
  technical: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  certification: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

export default function TrainingCalendar({ trainings = [], registeredTrainingIds = [], onSelectTraining }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  // Build weeks
  const weeks = [];
  let day = calStart;
  while (day <= calEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const getTrainingsForDay = (d) =>
    trainings.filter(t => t.session_date && isSameDay(parseISO(t.session_date), d));

  const selectedDayTrainings = selectedDay ? getTrainingsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(categoryColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-600 capitalize">
            <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
            {cat}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-[#005f27]" />
          Registered
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-slate-50 last:border-0">
            {week.map((d, di) => {
              const dayTrainings = getTrainingsForDay(d);
              const inMonth = isSameMonth(d, currentMonth);
              const selected = selectedDay && isSameDay(d, selectedDay);
              const today = isToday(d);

              return (
                <div
                  key={di}
                  onClick={() => setSelectedDay(selected ? null : d)}
                  className={cn(
                    "min-h-[80px] p-1.5 cursor-pointer transition-colors border-r border-slate-50 last:border-0",
                    inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50/50",
                    selected && "bg-[#edf0be]/60 hover:bg-[#edf0be]/60"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1",
                    today ? "bg-[#005f27] text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                  )}>
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayTrainings.slice(0, 2).map(t => {
                      const isReg = registeredTrainingIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "text-[10px] px-1 py-0.5 rounded truncate font-medium leading-tight",
                            isReg
                              ? "bg-[#005f27]/10 text-[#005f27] border border-[#005f27]/20"
                              : categoryBg[t.category] || "bg-slate-100 text-slate-600"
                          )}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTrainings.length > 2 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{dayTrainings.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-800 mb-3">
            {format(selectedDay, 'EEEE, MMMM d, yyyy')}
          </h3>
          {selectedDayTrainings.length === 0 ? (
            <p className="text-sm text-slate-400">No training sessions on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayTrainings.map(t => {
                const isReg = registeredTrainingIds.includes(t.id);
                const isFull = t.max_participants && (t.current_registrations || 0) >= t.max_participants;
                return (
                  <div key={t.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 hover:bg-[#edf0be]/40 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", categoryColors[t.category] || "bg-slate-400")} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{t.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {t.start_time && (
                            <span className="text-xs text-slate-500">{t.start_time}{t.end_time ? ` – ${t.end_time}` : ''}</span>
                          )}
                          {t.is_online ? (
                            <span className="text-xs text-slate-500 flex items-center gap-1"><Video className="h-3 w-3" /> Online</span>
                          ) : t.location && (
                            <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.location}</span>
                          )}
                          {t.max_participants && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Users className="h-3 w-3" /> {t.current_registrations || 0}/{t.max_participants}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-[10px] capitalize px-1.5 py-0">{t.category}</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={cn(
                        "flex-shrink-0 h-7 text-xs rounded-lg",
                        isReg
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-[#005f27] hover:bg-[#436a36] text-white"
                      )}
                      disabled={isReg || isFull}
                      onClick={() => onSelectTraining(t)}
                    >
                      {isReg ? 'Registered' : isFull ? 'Full' : 'Register'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}