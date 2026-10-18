"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const topics = [
  { label: "Network security", query: "network" },
  { label: "Digital forensics", query: "forensic" },
  { label: "Incident response", query: "incident" },
];
export function HeroExplorer() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  return (
    <form
      className="hero-explorer"
      role="search"
      aria-label="Discover cybersecurity resources"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(
          query.trim()
            ? "/resources?q=" + encodeURIComponent(query.trim())
            : "/resources",
        );
      }}
    >
      <div className="explorer-heading">
        <span>
          <Sparkles size={14} /> A LITTLE CURIOSITY GOES A LONG WAY
        </span>
        <span className="explorer-status">
          <span /> Start anywhere
        </span>
      </div>
      <div className="explorer-input">
        <Search size={20} />
        <Input
          aria-label="What would you like to explore?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would you like to explore?"
        />
      </div>
      <div className="explorer-bottom">
        <div className="explorer-topics" aria-label="Suggested topics">
          {topics.map((t) => (
            <Button
              key={t.query}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={query === t.query}
              onClick={() => setQuery(t.query)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button type="submit" className="explorer-submit">
          Explore <ArrowUpRight size={16} />
        </Button>
      </div>
    </form>
  );
}
