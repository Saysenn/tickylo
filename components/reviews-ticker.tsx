"use client";

import { Star } from "lucide-react";

const reviews = [
  {
    name: "Sarah Mitchell",
    role: "Founder",
    company: "Pixel & Co Agency",
    initials: "SM",
    color: "bg-blue-100 text-blue-700",
    rating: 5,
    text: "We finally know exactly how many billable hours go into each client. Invoicing used to be a guess — now it's a report. Tickylo paid for itself in week one.",
    date: "2 weeks ago",
  },
  {
    name: "James Okafor",
    role: "Dev Studio Director",
    company: "NovaBuild",
    initials: "JO",
    color: "bg-orange-100 text-orange-700",
    rating: 5,
    text: "Deadline tracking across multiple projects used to be chaos. Now I open one dashboard and know exactly who's behind and why. Our delivery rate is up noticeably.",
    date: "1 month ago",
  },
  {
    name: "Priya Sharma",
    role: "Agency Operations Lead",
    company: "Brightside Creative",
    initials: "PS",
    color: "bg-purple-100 text-purple-700",
    rating: 5,
    text: "Our freelancers are spread across time zones. Tickylo gives us one view of output and hours without chasing anyone for updates. Huge time saver.",
    date: "3 weeks ago",
  },
  {
    name: "Marcus Webb",
    role: "CEO",
    company: "Loopline Studio",
    initials: "MW",
    color: "bg-green-100 text-green-700",
    rating: 5,
    text: "We replaced three separate tools with Tickylo. Billable hours, task tracking, and team reports all in one place. The team adopted it within a day.",
    date: "2 months ago",
  },
  {
    name: "Amara Nwosu",
    role: "Marketing Agency Owner",
    company: "Velocity Media",
    initials: "AN",
    color: "bg-rose-100 text-rose-700",
    rating: 5,
    text: "Client reporting used to take hours every Friday. Now I export a clean report in minutes. The AI insights also helped us spot which retainer clients were eating too much time.",
    date: "5 weeks ago",
  },
];

export default function ReviewsTicker() {
  const doubled = [...reviews, ...reviews];

  return (
    <div className="overflow-hidden w-full" aria-label="Customer reviews">
      <div className="flex w-max animate-marquee">
        {doubled.map((review, i) => (
          <div
            key={i}
            className="glass rounded-2xl p-5 mx-3 w-72 shrink-0 flex flex-col gap-3 shadow-[0_2px_20px_rgba(128,237,153,0.06)]"
          >
            {/* Stars */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: review.rating }).map((_, s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-warning text-warning" />
              ))}
            </div>

            {/* Text */}
            <p className="text-xs text-ink-3 leading-relaxed flex-1">"{review.text}"</p>

            {/* Reviewer */}
            <div className="flex items-center gap-2.5 pt-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${review.color}`}
              >
                {review.initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{review.name}</p>
                <p className="text-[11px] text-ink-3 truncate">
                  {review.role} · {review.company}
                </p>
              </div>
              <span className="ml-auto text-[11px] text-ink-3 shrink-0">{review.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
