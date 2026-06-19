import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Github, Headset, Loader2, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const faqItems = [
  {
    question: "How fast do you actually respond?",
    answer:
      "We're humans, not bots — so it depends on time zones and sleep schedules. But most questions in our Discord get answered within a few hours. Email responses are typically within 24 hours.",
  },
  {
    question: "Do you offer paid support plans?",
    answer:
      "We don't have formal support tiers. Every user gets the same human-level support. For large enterprise deployments, we offer a dedicated success engineer as part of our Enterprise plan.",
  },
  {
    question: "Can I schedule a demo or call?",
    answer:
      "We don't do traditional sales calls. If you need help, just ask in Discord or send an email. We're happy to jump on a call if it's the best way to solve your problem.",
  },
  {
    question: "I found a bug — what should I do?",
    answer:
      "The fastest way is to open an issue on GitHub. Include steps to reproduce, expected vs actual behavior, and screenshots if relevant. We triage bugs daily.",
  },
  {
    question: "How do I request a new feature?",
    answer:
      "Post a feature request on GitHub Discussions or mention it in Discord. We actively read and tag every request. Many of our best features came directly from community suggestions.",
  },
];

/* ------------------------------------------------------------------ */
/*  Subject options                                                     */
/* ------------------------------------------------------------------ */
const subjectOptions = [
  { value: "", label: "Select a topic" },
  { value: "Help with setup", label: "Help with setup" },
  { value: "Billing question", label: "Billing question" },
  { value: "Feature request", label: "Feature request" },
  { value: "Bug report", label: "Bug report" },
  { value: "Something else", label: "Something else" },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function TalkToHumanPage() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [shakeCount, setShakeCount] = useState(0);

  /* Form field change handler */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /* Submit handler */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Please enter your name";
    if (!form.email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!validateEmail(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!form.message.trim()) newErrors.message = "Please enter a message";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeCount((c) => c + 1);
      return;
    }

    setStatus("submitting");
    // Simulate API call
    setTimeout(() => {
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Hero ── */}
      <motion.div
        className="flex flex-col items-center px-8 pt-7 pb-5"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1
          className="text-3xl font-bold text-[#1A1A1A] text-center"
          variants={fadeUp}
          custom={0}
        >
          Talk to a human
        </motion.h1>
        <motion.p
          className="text-base text-[#6B6B6B] text-center mt-3 leading-relaxed max-w-sm"
          variants={fadeUp}
          custom={1}
        >
          We actually respond. No chatbots, no automated runarounds. Real humans who know the
          product.
        </motion.p>
        <motion.div className="mt-5" variants={fadeUp} custom={2}>
          <div className="w-16 h-16 rounded-full bg-[#F76E18]/10 flex items-center justify-center">
            <Headset className="w-8 h-8 text-[#F76E18]" />
          </div>
        </motion.div>
      </motion.div>

      {/* ── Contact Cards ── */}
      <motion.div
        className="grid grid-cols-3 gap-4 px-8 pb-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Discord */}
        <motion.div
          className="border border-[#E5E5E5] rounded-xl p-5 bg-white flex flex-col"
          variants={staggerItem}
        >
          <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#5865F2]" />
          </div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mt-3">Community Discord</h3>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            Join 10,000+ developers in our community Discord. Get help, share ideas, or just hang
            out.
          </p>
          <a
            href="https://discord.gg/posthog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            Join Discord <ArrowRight className="w-3 h-3" />
          </a>
        </motion.div>

        {/* Email */}
        <motion.div
          className="border border-[#E5E5E5] rounded-xl p-5 bg-white flex flex-col"
          variants={staggerItem}
        >
          <div className="w-10 h-10 rounded-full bg-[#F76E18]/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#F76E18]" />
          </div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mt-3">Email</h3>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            Prefer email? Reach out to us at hey@posthog.com. We read every message.
          </p>
          <a
            href="mailto:hey@posthog.com"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            hey@posthog.com <ArrowRight className="w-3 h-3" />
          </a>
        </motion.div>

        {/* GitHub */}
        <motion.div
          className="border border-[#E5E5E5] rounded-xl p-5 bg-white flex flex-col"
          variants={staggerItem}
        >
          <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
            <Github className="w-5 h-5 text-[#1A1A1A]" />
          </div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mt-3">GitHub</h3>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            Found a bug or have a feature request? Open an issue on GitHub.
          </p>
          <a
            href="https://github.com/PostHog/posthog/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            Open GitHub <ArrowRight className="w-3 h-3" />
          </a>
        </motion.div>
      </motion.div>

      {/* ── Contact Form ── */}
      <motion.div
        className="px-8 py-6 border-t border-[#E5E5E5]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.4,
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
      >
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Or send us a message</h2>
        <p className="text-sm text-[#6B6B6B] mb-5">
          We&apos;ll get back to you within 24 hours. Usually much faster.
        </p>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-[#22C55E]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A]">Message sent!</h3>
              <p className="text-sm text-[#6B6B6B] mt-1">We&apos;ll be in touch soon.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-lg border-[#D1D1D1]"
                onClick={() => setStatus("idle")}
              >
                Send another message
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: shakeCount > 0 ? [0, -4, 4, -4, 4, 0] : 0 }}
              transition={{ duration: 0.35 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
              noValidate
            >
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="James Hawkins"
                  className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm placeholder-[#9CA3AF] transition-all outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                    errors.name ? "border-[#DC2626]" : "border-[#D1D1D1]"
                  }`}
                />
                <AnimatePresence>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-[#DC2626] mt-1"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="james@posthog.com"
                  className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm placeholder-[#9CA3AF] transition-all outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                    errors.email ? "border-[#DC2626]" : "border-[#D1D1D1]"
                  }`}
                />
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-[#DC2626] mt-1"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  What can we help with?
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="w-full bg-white border border-[#D1D1D1] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] transition-all outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 appearance-none cursor-pointer"
                >
                  {subjectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Your message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm placeholder-[#9CA3AF] resize-vertical transition-all outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                    errors.message ? "border-[#DC2626]" : "border-[#D1D1D1]"
                  }`}
                />
                <AnimatePresence>
                  {errors.message && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-[#DC2626] mt-1"
                    >
                      {errors.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-[#F76E18] hover:bg-[#E56310] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 h-auto disabled:opacity-70"
              >
                {status === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send message"
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── FAQ Accordion ── */}
      <motion.div
        className="px-8 py-6 border-t border-[#E5E5E5]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.35 }}
      >
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`faq-${idx}`}
              className="border-b border-[#E5E5E5] last:border-b-0"
            >
              <AccordionTrigger className="text-sm font-medium text-[#1A1A1A] hover:no-underline py-3.5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#6B6B6B] leading-relaxed pb-3.5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {/* ── Footer note ── */}
      <div className="px-8 py-5 border-t border-[#E5E5E5] text-center">
        <p className="text-sm text-[#6B6B6B]">Prefer to figure things out yourself?</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          Check out our{" "}
          <a href="/docs" className="text-[#2563EB] hover:underline">
            Docs
          </a>{" "}
          or browse{" "}
          <a href="/community" className="text-[#2563EB] hover:underline">
            Community Questions
          </a>
        </p>
      </div>
    </div>
  );
}
