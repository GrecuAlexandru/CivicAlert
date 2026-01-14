"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function TicketCommentCount({ ticketId }: { ticketId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, "tickets", ticketId, "comments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [ticketId]);

  if (count === null) return <span className="animate-pulse">...</span>;

  return <span>{count}</span>;
}
