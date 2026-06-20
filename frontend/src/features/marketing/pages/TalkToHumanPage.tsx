import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Github, Headset, Loader2, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function TalkToHumanPage() {
  const { t } = useTranslation("marketing");
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [shakeCount, setShakeCount] = useState(0);

  const subjectOptions = t("talkToHuman.form.subjects", { returnObjects: true }) as {
    value: string;
    label: string;
  }[];
  const faqItems = t("talkToHuman.faq.items", { returnObjects: true }) as {
    question: string;
    answer: string;
  }[];

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
    if (!form.name.trim()) newErrors.name = t("talkToHuman.form.fields.name.error");
    if (!form.email.trim()) {
      newErrors.email = t("talkToHuman.form.fields.email.errorRequired");
    } else if (!validateEmail(form.email)) {
      newErrors.email = t("talkToHuman.form.fields.email.errorInvalid");
    }
    if (!form.message.trim()) newErrors.message = t("talkToHuman.form.fields.message.error");

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
          {t("talkToHuman.hero.title")}
        </motion.h1>
        <motion.p
          className="text-base text-[#6B6B6B] text-center mt-3 leading-relaxed max-w-sm"
          variants={fadeUp}
          custom={1}
        >
          {t("talkToHuman.hero.subtitle")}
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
          <h2 className="text-sm font-semibold text-[#1A1A1A] mt-3">
            {t("talkToHuman.contactCards.discord.title")}
          </h2>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            {t("talkToHuman.contactCards.discord.body")}
          </p>
          <a
            href="https://discord.gg/posthog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            {t("talkToHuman.contactCards.discord.link")} <ArrowRight className="w-3 h-3" />
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
          <h2 className="text-sm font-semibold text-[#1A1A1A] mt-3">
            {t("talkToHuman.contactCards.email.title")}
          </h2>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            {t("talkToHuman.contactCards.email.body")}
          </p>
          <a
            href="mailto:hey@posthog.com"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            {t("talkToHuman.contactCards.email.link")} <ArrowRight className="w-3 h-3" />
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
          <h2 className="text-sm font-semibold text-[#1A1A1A] mt-3">
            {t("talkToHuman.contactCards.github.title")}
          </h2>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            {t("talkToHuman.contactCards.github.body")}
          </p>
          <a
            href="https://github.com/PostHog/posthog/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            {t("talkToHuman.contactCards.github.link")} <ArrowRight className="w-3 h-3" />
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
        <h2 className="text-lg font-semibold text-[#1A1A1A]">{t("talkToHuman.form.title")}</h2>
        <p className="text-sm text-[#6B6B6B] mb-5">{t("talkToHuman.form.subtitle")}</p>

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
              <h3 className="text-lg font-semibold text-[#1A1A1A]">
                {t("talkToHuman.form.success.title")}
              </h3>
              <p className="text-sm text-[#6B6B6B] mt-1">
                {t("talkToHuman.form.success.subtitle")}
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-lg border-[#D1D1D1]"
                onClick={() => setStatus("idle")}
              >
                {t("talkToHuman.form.success.reset")}
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
                  {t("talkToHuman.form.fields.name.label")}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t("talkToHuman.form.fields.name.placeholder")}
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
                  {t("talkToHuman.form.fields.email.label")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t("talkToHuman.form.fields.email.placeholder")}
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
                  {t("talkToHuman.form.fields.subject.label")}
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
                  {t("talkToHuman.form.fields.message.label")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder={t("talkToHuman.form.fields.message.placeholder")}
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
                    {t("talkToHuman.form.sending")}
                  </span>
                ) : (
                  t("talkToHuman.form.submit")
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
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">{t("talkToHuman.faq.title")}</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, idx) => (
            <AccordionItem
              key={item.question}
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
        <p className="text-sm text-[#6B6B6B]">{t("talkToHuman.footer.selfServe")}</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          {t("talkToHuman.footer.linksBefore")}
          <a href="/docs" className="text-[#2563EB] hover:underline">
            {t("talkToHuman.footer.docs")}
          </a>
          {t("talkToHuman.footer.linksMiddle")}
          <a href="/community" className="text-[#2563EB] hover:underline">
            {t("talkToHuman.footer.community")}
          </a>
          {t("talkToHuman.footer.linksAfter")}
        </p>
      </div>
    </div>
  );
}
