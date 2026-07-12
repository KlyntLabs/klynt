import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import { cn } from "@/lib/utils";
import { type ContactFormData, createContactSchema } from "./contact-schema";

const SUBMIT_DELAY_MS = 1200;

interface SubjectOption {
  value: string;
  label: string;
}

export function ContactForm() {
  const { t, array } = useMarketingTranslation();
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [shakeCount, setShakeCount] = useState(0);

  const subjectOptions = array<SubjectOption>("talkToHuman.form.subjects");

  const form = useForm<ContactFormData>({
    resolver: zodResolver(createContactSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      subject: subjectOptions[0]?.value ?? "",
      message: "",
    },
  });

  const onSubmit = () => {
    setStatus("submitting");
    // Simulate API call until a contact endpoint exists.
    window.setTimeout(() => {
      setStatus("success");
    }, SUBMIT_DELAY_MS);
  };

  const onInvalid = () => {
    setShakeCount((count) => count + 1);
  };

  return (
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
          <p className="text-sm text-[#6B6B6B] mt-1">{t("talkToHuman.form.success.subtitle")}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-lg border-[#D1D1D1]"
            onClick={() => {
              setStatus("idle");
              form.reset();
            }}
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
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="space-y-4"
          noValidate
        >
          <Form {...form}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1A1A1A]">
                    {t("talkToHuman.form.fields.name.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder={t("talkToHuman.form.fields.name.placeholder")}
                      className="border-[#D1D1D1] focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20"
                    />
                  </FormControl>
                  <FormMessage className="text-[#DC2626]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1A1A1A]">
                    {t("talkToHuman.form.fields.email.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={t("talkToHuman.form.fields.email.placeholder")}
                      className="border-[#D1D1D1] focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20"
                    />
                  </FormControl>
                  <FormMessage className="text-[#DC2626]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1A1A1A]">
                    {t("talkToHuman.form.fields.subject.label")}
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className={cn(
                        "w-full bg-white border border-[#D1D1D1] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A]",
                        "transition-all outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 appearance-none cursor-pointer"
                      )}
                    >
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1A1A1A]">
                    {t("talkToHuman.form.fields.message.label")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("talkToHuman.form.fields.message.placeholder")}
                      rows={5}
                      className="border-[#D1D1D1] focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20 resize-vertical"
                    />
                  </FormControl>
                  <FormMessage className="text-[#DC2626]" />
                </FormItem>
              )}
            />

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
          </Form>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
