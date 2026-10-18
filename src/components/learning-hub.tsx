"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  FlaskConical,
  Search,
  ShieldCheck,
  Terminal,
  CheckCircle2,
} from "lucide-react";
import { learningLabs } from "@/lib/learning-labs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import styles from "./learning-hub.module.css";

type Lab = (typeof learningLabs)[number];
export function LearningHub() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [level, setLevel] = useState("All levels");
  const [selected, setSelected] = useState<Lab | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const categories = [
    "All topics",
    ...new Set(learningLabs.map((lab) => lab.category)),
  ];
  const labs = learningLabs.filter(
    (lab) =>
      (category === "All topics" || lab.category === category) &&
      (level === "All levels" || lab.level === level) &&
      `${lab.title} ${lab.description} ${lab.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function open(lab: Lab) {
    setSelected(lab);
    setAnswer(null);
    setFeedback(null);
  }
  return (
    <div className={styles.hub}>
      <section className={styles.spotlight} aria-label="Featured practice">
        <div>
          <span className={styles.kicker}>
            <FlaskConical size={16} /> THE PRACTICE ROOM
          </span>
          <h2>
            Curiosity is your
            <br />
            best starting point.
          </h2>
          <p>
            Start with a small challenge. Follow the clues. Build the confidence
            to take on the next one.
          </p>
          <Button onClick={() => open(learningLabs[0])}>
            Try your first lab <ArrowUpRight size={17} />
          </Button>
          <small>Beginner friendly · 15 minutes · Demo exercise</small>
        </div>
        <div className={styles.terminal} aria-hidden="true">
          <div>
            <i />
            <i />
            <i />
            <span>your next discovery</span>
          </div>
          <pre>
            {
              "$ open practice-room\n\n  > Read the scenario\n  > Follow the evidence\n  > Check your thinking\n\n  Ready when you are. _"
            }
          </pre>
          <ShieldCheck size={46} />
        </div>
      </section>
      <div className={styles.catalogHeading} id="labs">
        <div>
          <span className="eyebrow">ONE SKILL AT A TIME</span>
          <h2>Find your next challenge.</h2>
        </div>
        <span className={styles.demoBadge}>Demo labs</span>
      </div>
      <p className={styles.explainer}>
        These sample exercises let you explore a scenario and check your answer.
        No live systems, downloads, or lab accounts are needed.
      </p>
      <div className={styles.searchRow}>
        <label className={styles.search}>
          <Search size={18} />
          <span className="sr-only">Search labs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a lab, topic, or skill…"
          />
        </label>
        <label>
          <span className="sr-only">Difficulty</span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            {["All levels", "Beginner", "Intermediate", "Advanced"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className={styles.filters} aria-label="Learning topics">
        {categories.map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <p className={styles.resultCount} role="status">
        {labs.length} {labs.length === 1 ? "lab" : "labs"} to explore
      </p>
      <div className={styles.grid}>
        {labs.map((lab) => (
          <article className={styles.card} key={lab.id}>
            <div className={styles.cardTop}>
              <span className={styles.labIcon}>
                <Terminal size={23} />
              </span>
              <span className={styles.level} data-level={lab.level}>
                {lab.level}
              </span>
            </div>
            <span className={styles.category}>{lab.category}</span>
            <h3>{lab.title}</h3>
            <p>{lab.description}</p>
            <div className={styles.cardBottom}>
              <span>
                <Clock3 size={14} />
                {lab.minutes} min
              </span>
              <button
                type="button"
                onClick={() => open(lab)}
                aria-label={`Open lab: ${lab.title}`}
              >
                Explore lab <ArrowUpRight size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!labs.length && (
        <div className={styles.empty}>
          <Search size={28} />
          <h3>No labs found.</h3>
          <p>Try another topic or search term.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCategory("All topics");
              setLevel("All levels");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      <div className={styles.note}>
        <ShieldCheck size={22} />
        <p>
          <strong>Practise with purpose.</strong> Explore only systems you own
          or have permission to test. These exercises use fictional scenarios
          and example data.
        </p>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
      >
        <DialogContent className={styles.labDialog}>
          {selected && (
            <>
              <span className={styles.category}>
                {selected.category} · {selected.level} · Demo
              </span>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>{selected.objective}</DialogDescription>
              <div className={styles.exercise}>
                <div>
                  <h3>Your investigation</h3>
                  <ol>
                    {selected.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3>The evidence</h3>
                  <pre>{selected.evidence}</pre>
                </div>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (answer !== null) setFeedback(answer === selected.correct);
                }}
              >
                <fieldset className={styles.answers}>
                  <legend>{selected.question}</legend>
                  {selected.choices.map((choice, index) => (
                    <label key={choice}>
                      <input
                        type="radio"
                        name="lab-answer"
                        required
                        value={index}
                        checked={answer === index}
                        onChange={() => {
                          setAnswer(index);
                          setFeedback(null);
                        }}
                      />
                      {choice}
                    </label>
                  ))}
                </fieldset>
                <Button type="submit" disabled={answer === null}>
                  Check answer
                </Button>
              </form>
              {feedback !== null && (
                <div
                  role="status"
                  className={styles.feedback}
                  data-correct={feedback}
                >
                  {feedback ? (
                    <>
                      <CheckCircle2 size={20} />
                      <div>
                        <strong>Well spotted.</strong>
                        <p>{selected.explanation}</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <strong>Take another look.</strong>
                      <p>Read the evidence and try a different answer.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
