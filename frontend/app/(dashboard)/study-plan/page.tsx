"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  ApiError,
  createStudyPlanItem,
  deleteStudyPlanItem,
  listDocuments,
  listStudyPlanItems,
  updateStudyPlanItem,
} from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document, StudyPlanItem } from "@/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function endOfWeekSunday(weekStart: Date): Date {
  const d = addDays(weekStart, 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const y =
    weekStart.getFullYear() !== end.getFullYear()
      ? { year: "numeric" as const }
      : {};
  return `${weekStart.toLocaleDateString(undefined, { ...opts, ...y })} – ${end.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dueStatus(iso: string, completed: boolean): string {
  if (completed) return "done";
  const due = new Date(iso);
  const now = new Date();
  if (due < now) return "overdue";
  const today = new Date();
  if (sameCalendarDay(due, today)) return "today";
  return "upcoming";
}

export default function StudyPlanPage() {
  const { userId } = useDashboardUser();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [items, setItems] = useState<StudyPlanItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("17:00");
  const [documentId, setDocumentId] = useState("");
  const [remindDays, setRemindDays] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const weekEnd = useMemo(() => endOfWeekSunday(weekStart), [weekStart]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStudyPlanItems(userId, {
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
        includeCompleted: true,
      });
      setItems(data.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load study plan"
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart, weekEnd]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    listDocuments(userId)
      .then((d) => setDocuments(d.documents))
      .catch(() => setDocuments([]));
  }, [userId]);

  const days = useMemo(
    () => WEEKDAY_LABELS.map((label, i) => ({ label, date: addDays(weekStart, i) })),
    [weekStart]
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, StudyPlanItem[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const item of items) {
      const due = new Date(item.due_at);
      for (let i = 0; i < 7; i++) {
        if (sameCalendarDay(due, addDays(weekStart, i))) {
          map.get(i)!.push(item);
          break;
        }
      }
    }
    return map;
  }, [items, weekStart]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    setFormMessage(null);
    const dueAt = new Date(`${dueDate}T${dueTime || "17:00"}`);
    try {
      await createStudyPlanItem({
        user_id: userId,
        title: title.trim(),
        due_at: dueAt.toISOString(),
        document_id: documentId || null,
        remind_days_before: remindDays,
      });
      setTitle("");
      setDueDate("");
      setDocumentId("");
      setFormMessage("Task added to your study plan.");
      await loadItems();
    } catch (err) {
      setFormMessage(
        err instanceof ApiError ? err.message : "Could not save task"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (item: StudyPlanItem) => {
    try {
      await updateStudyPlanItem(item.id, { completed: !item.completed });
      await loadItems();
    } catch {
      setError("Failed to update task");
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteStudyPlanItem(itemId);
      await loadItems();
    } catch {
      setError("Failed to delete task");
    }
  };

  const goToday = () => setWeekStart(startOfWeekMonday(new Date()));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Study plan"
        subtitle="Deadlines for lectures, exams, and review sessions — with gentle reminders"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="btn-ghost !py-2 !px-3 text-sm"
            >
              ← Prev
            </button>
            <button type="button" onClick={goToday} className="btn-ghost !py-2 !px-3 text-sm">
              This week
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="btn-ghost !py-2 !px-3 text-sm"
            >
              Next →
            </button>
          </div>
        }
      />

      <p className="text-sm font-medium text-accent font-mono flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {formatWeekRange(weekStart)}
      </p>

      {error && <p className="alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Add deadline</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="taskTitle" className="label-field">
              Title
            </label>
            <input
              id="taskTitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CSE350 midterm review"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="dueDate" className="label-field">
              Due date
            </label>
            <input
              id="dueDate"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="dueTime" className="label-field">
              Due time
            </label>
            <input
              id="dueTime"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="docLink" className="label-field">
              Link to lecture (optional)
            </label>
            <select
              id="docLink"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="select-field"
            >
              <option value="">None</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="remind" className="label-field">
              Remind me before
            </label>
            <select
              id="remind"
              value={remindDays}
              onChange={(e) => setRemindDays(Number(e.target.value))}
              className="select-field"
            >
              <option value={0}>On the due day</option>
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
            </select>
          </div>
        </div>
        {formMessage && (
          <p
            className={
              formMessage.includes("added") ? "alert-success" : "alert-error"
            }
          >
            {formMessage}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-glow !py-2.5 disabled:opacity-50">
          {saving ? "Adding…" : "Add to plan"}
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading week…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day, index) => {
            const dayItems = itemsByDay.get(index) ?? [];
            const isToday = sameCalendarDay(day.date, new Date());
            return (
              <div
                key={day.label}
                className={`rounded-xl border min-h-[140px] flex flex-col ${
                  isToday
                    ? "border-accent/40 bg-accent-muted/20 shadow-glow-sm"
                    : "border-subtle bg-card"
                }`}
              >
                <div
                  className={`px-3 py-2 border-b text-center ${
                    isToday ? "border-accent/30" : "border-subtle"
                  }`}
                >
                  <p className="text-xs font-semibold text-muted uppercase">{day.label}</p>
                  <p className={`text-sm font-medium font-mono ${isToday ? "text-accent" : "text-foreground"}`}>
                    {day.date.getDate()}
                  </p>
                </div>
                <ul className="p-2 space-y-2 flex-1">
                  {dayItems.length === 0 && (
                    <li className="text-xs text-muted text-center py-4">—</li>
                  )}
                  {dayItems.map((item) => {
                    const status = dueStatus(item.due_at, item.completed);
                    return (
                      <li
                        key={item.id}
                        className={`rounded-lg border px-2 py-2 text-xs ${
                          item.completed
                            ? "border-subtle bg-elevated opacity-60"
                            : status === "overdue"
                              ? "border-red-500/30 bg-red-500/10"
                              : status === "today"
                                ? "border-amber-500/30 bg-amber-500/10"
                                : "border-subtle bg-elevated"
                        }`}
                      >
                        <p
                          className={`font-medium text-foreground line-clamp-2 ${
                            item.completed ? "line-through" : ""
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-muted mt-0.5 font-mono">{formatTime(item.due_at)}</p>
                        {item.document_id && (
                          <Link
                            href={`/documents/${item.document_id}`}
                            className="text-accent hover:text-accent-hover mt-1 block truncate"
                          >
                            {item.document_filename ?? "Lecture"}
                          </Link>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => toggleComplete(item)}
                            className="text-accent hover:text-accent-hover"
                          >
                            {item.completed ? "Undo" : "Done"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted text-center">
          No deadlines this week. Add one above or browse another week.
        </p>
      )}
    </div>
  );
}
