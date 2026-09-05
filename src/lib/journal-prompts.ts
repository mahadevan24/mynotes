export type JournalPromptCategory = {
  title: string;
  prompts: string[];
};

export const JOURNAL_PROMPT_CATEGORIES: JournalPromptCategory[] = [
  {
    title: "Daily reflection",
    prompts: [
      "What's on your mind?",
      "What am I grateful for?",
      "Where am I winning?",
      "What do I need or want to let go of?",
      "What does my ideal day ahead look like?",
      "How can I be of highest service?",
      "What do I want to be remembered for?",
    ],
  },
  {
    title: "Ownership and impact",
    prompts: [
      "What problem can I move closer to delivery today?",
      "What is unclear, and whose input would help me clarify it?",
      "What did I improve today, and what evidence shows the difference?",
      "What recurring friction at IBM could I take ownership of?",
      "What did I finish and deliver, rather than merely work on?",
    ],
  },
  {
    title: "Engineering judgment",
    prompts: [
      "What trade-off did I make today, and why?",
      "What could fail in what I’m building, and how will I catch it?",
      "Did I address the underlying problem or only its symptoms?",
      "What did I do to make this easier to test, operate, or maintain?",
      "What decision or risk should I communicate before it becomes a surprise?",
    ],
  },
  {
    title: "Learning and interview readiness",
    prompts: [
      "What can I now solve, build, or explain that I couldn’t yesterday?",
      "What technical decision did I make or study today, and what were the trade-offs?",
      "Where did I need help, and what would let me handle it independently next time?",
      "What concrete example from today could support an interview story?",
      "Which gap deserves focused practice tomorrow?",
    ],
  },
  {
    title: "Focus and sustainability",
    prompts: [
      "Did my best attention go toward my most important problem?",
      "What distracted me, and what change would make tomorrow easier?",
      "What time will I stop tonight to protect sleep and tomorrow’s concentration?",
      "What is the single most useful thing to finish tomorrow?",
    ],
  },
];
