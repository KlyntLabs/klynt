import { Badge } from "@astryxdesign/core/Badge";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";

/** The code column's cap. Past the spacing scale, so it rides the stack's own maxWidth prop. */
const CODE_COLUMN_MAX_WIDTH = 384;

export function SlideIntegration() {
  const { t } = useTranslation("marketing");
  const frameworks = t("productAnalytics.slides.integration.frameworks", {
    returnObjects: true,
  }) as string[];

  const code = [
    t("productAnalytics.slides.integration.codeComment1"),
    "import { useKlynt } from '@klynt/js/react'",
    "",
    t("productAnalytics.slides.integration.codeComment2"),
    "const klynt = useKlynt()",
  ].join("\n");

  return (
    <VStack height="100%" paddingInline={8} gap={8} align="center" justify="center">
      <VStack gap={6} align="center">
        <Heading level={2} justify="center">
          {t("productAnalytics.slides.integration.title")}
        </Heading>

        <HStack gap={2} wrap="wrap" justify="center" maxWidth={448}>
          {frameworks.map((framework) => (
            <Badge key={framework} variant="neutral" label={framework} />
          ))}
        </HStack>
      </VStack>

      <VStack width="100%" maxWidth={CODE_COLUMN_MAX_WIDTH}>
        <CodeBlock
          code={code}
          language="typescript"
          hasCopyButton={false}
          hasLanguageLabel={false}
          width="100%"
        />
      </VStack>
    </VStack>
  );
}
