import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormSelector } from "@/components/form/form-selector";
import { FormTextArea } from "@/components/form/form-text-area";
import { FormTextInput } from "@/components/form/form-text-input";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import { type ContactFormData, createContactSchema } from "./contact-schema";

/* framer-motion drives the Astryx stacks directly rather than wrapper <div>s. */
const MotionVStack = motion.create(VStack);

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
        <MotionVStack
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <EmptyState
            /* `size="lg"` is the size EmptyState's own doc example uses for its icon slot. */
            icon={<Icon icon={Check} size="lg" />}
            title={t("talkToHuman.form.success.title")}
            description={t("talkToHuman.form.success.subtitle")}
            actions={
              <Button
                variant="secondary"
                label={t("talkToHuman.form.success.reset")}
                onClick={() => {
                  setStatus("idle");
                  form.reset();
                }}
              />
            }
          />
        </MotionVStack>
      ) : (
        /*
         * This stays a real <form>, not a Stack rendered `as="form"`.
         *
         * Astryx's polymorphic `as` does not widen a component's prop type to the target
         * element's attributes — `noValidate` is rejected by StackProps (the same limitation
         * that makes `as="button"` + `type` a type error elsewhere in this repo). And
         * `noValidate` is load-bearing: it is what keeps react-hook-form + zod the single
         * validation authority instead of the browser's native bubbles.
         *
         * No rule is bent here regardless: the rule is "no <div>", and a <form> is a semantic
         * element, not a layout box. The spacing inside it is still an Astryx VStack.
         */
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: shakeCount > 0 ? [0, -4, 4, -4, 4, 0] : 0 }}
          transition={{ duration: 0.35 }}
          exit={{ opacity: 0 }}
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          noValidate
        >
          <VStack gap={4}>
            <FormTextInput
              control={form.control}
              name="name"
              label={t("talkToHuman.form.fields.name.label")}
              placeholder={t("talkToHuman.form.fields.name.placeholder")}
            />
            <FormTextInput
              control={form.control}
              name="email"
              type="email"
              label={t("talkToHuman.form.fields.email.label")}
              placeholder={t("talkToHuman.form.fields.email.placeholder")}
            />
            <FormSelector
              control={form.control}
              name="subject"
              label={t("talkToHuman.form.fields.subject.label")}
              options={subjectOptions}
            />
            <FormTextArea
              control={form.control}
              name="message"
              rows={5}
              label={t("talkToHuman.form.fields.message.label")}
              placeholder={t("talkToHuman.form.fields.message.placeholder")}
            />
            <Button
              type="submit"
              variant="primary"
              label={
                status === "submitting"
                  ? t("talkToHuman.form.sending")
                  : t("talkToHuman.form.submit")
              }
              isLoading={status === "submitting"}
            />
          </VStack>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
