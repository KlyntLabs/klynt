import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { pixel, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createApiError } from "@/core/api/api-error";
import type { Session } from "../api/session-api";
import { useRevokeSession } from "../hooks/use-revoke-session";
import { useSessions } from "../hooks/use-sessions";

/** See roles-page: Astryx's Table constrains its row type to Record<string, unknown>. */
type SessionRow = Session & Record<string, unknown>;

function formatDate(value: string): string {
  return format(new Date(value), "yyyy-MM-dd HH:mm");
}

function resolveCurrentSessionId(sessions: Session[]): string | undefined {
  const explicit = sessions.find((s) => s.isCurrent);
  if (explicit) return explicit.id;
  const access = sessions.find((s) => s.kind === "access");
  if (access) return access.id;
  return sessions[0]?.id;
}

function SessionsTableSkeleton() {
  return (
    <VStack gap={2}>
      <Skeleton height={32} />
      <Skeleton height={32} index={1} />
      <Skeleton height={32} index={2} />
    </VStack>
  );
}

export default function SessionsPage() {
  const { t } = useTranslation("auth");

  const { data: sessions, isLoading, isError, error, refetch } = useSessions();
  const revoke = useRevokeSession();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const currentSessionId = sessions ? resolveCurrentSessionId(sessions) : undefined;

  function handleRevoke(id: string) {
    setRevokingId(id);
    revoke.mutate(id, {
      onSettled: () => setRevokingId(null),
    });
  }

  const columns: TableColumn<SessionRow>[] = [
    {
      key: "userAgent",
      header: t("sessions.columns.device"),
      renderCell: (session: SessionRow) => (
        <Text weight="medium">{session.userAgent || session.kind}</Text>
      ),
    },
    {
      key: "ipAddress",
      header: t("sessions.columns.ipAddress"),
      renderCell: (session: SessionRow) => <Text>{session.ipAddress || "—"}</Text>,
    },
    {
      key: "createdAt",
      header: t("sessions.columns.createdAt"),
      renderCell: (session: SessionRow) => <Text>{formatDate(session.createdAt)}</Text>,
    },
    {
      key: "expiresAt",
      header: t("sessions.columns.expiresAt"),
      renderCell: (session: SessionRow) => <Text>{formatDate(session.expiresAt)}</Text>,
    },
    {
      key: "status",
      header: t("sessions.columns.status"),
      renderCell: (session: SessionRow) =>
        session.id === currentSessionId ? (
          <Badge variant="success" label={t("sessions.currentLabel")} />
        ) : null,
    },
    {
      key: "actions",
      header: t("sessions.columns.actions"),
      width: pixel(140),
      renderCell: (session: SessionRow) => {
        const isCurrent = session.id === currentSessionId;
        const isRevoking = revokingId === session.id;
        return (
          <Button
            variant="destructive"
            size="sm"
            label={isRevoking ? t("sessions.revoking") : t("sessions.revoke")}
            aria-label={t("sessions.revokeAriaLabel", {
              device: session.userAgent || session.kind,
            })}
            isDisabled={isCurrent}
            isLoading={isRevoking}
            onClick={() => handleRevoke(session.id)}
          />
        );
      },
    },
  ];

  return (
    <Section>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>{t("sessions.title")}</Heading>
          <Text type="supporting">{t("sessions.description")}</Text>
        </VStack>

        {isLoading && <SessionsTableSkeleton />}

        {isError && (
          <Banner
            status="error"
            title={t("sessions.loadErrorTitle")}
            description={createApiError(error).message}
            endContent={
              <Button
                variant="secondary"
                size="sm"
                label={t("sessions.retry")}
                onClick={() => refetch()}
              />
            }
          />
        )}

        {!isLoading && !isError && sessions?.length === 0 && (
          <EmptyState title={t("sessions.empty")} isCompact />
        )}

        {!isLoading && !isError && sessions && sessions.length > 0 && (
          <Table data={sessions as SessionRow[]} columns={columns} idKey="id" hasHover />
        )}
      </VStack>
    </Section>
  );
}
