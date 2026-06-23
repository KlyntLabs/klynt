import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createApiError } from "@/core/api/api-error";
import { type Session } from "../api/session-api";
import { useRevokeSession } from "../hooks/use-revoke-session";
import { useSessions } from "../hooks/use-sessions";

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
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sessions.title")}</CardTitle>
        <CardDescription>{t("sessions.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <SessionsTableSkeleton />}
        {isError && (
          <Alert variant="destructive">
            <AlertTitle>{t("sessions.loadErrorTitle")}</AlertTitle>
            <AlertDescription>
              {createApiError(error).message}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                {t("sessions.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && sessions?.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("sessions.empty")}</p>
        )}
        {!isLoading && !isError && sessions && sessions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sessions.columns.device")}</TableHead>
                <TableHead>{t("sessions.columns.ipAddress")}</TableHead>
                <TableHead>{t("sessions.columns.createdAt")}</TableHead>
                <TableHead>{t("sessions.columns.expiresAt")}</TableHead>
                <TableHead>{t("sessions.columns.status")}</TableHead>
                <TableHead className="w-24">{t("sessions.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const isRevoking = revokingId === session.id;
                const deviceLabel = session.userAgent || session.kind;
                return (
                  <TableRow key={session.id} data-testid={`session-row-${session.id}`}>
                    <TableCell className="font-medium">{deviceLabel}</TableCell>
                    <TableCell>{session.ipAddress || "—"}</TableCell>
                    <TableCell>{formatDate(session.createdAt)}</TableCell>
                    <TableCell>{formatDate(session.expiresAt)}</TableCell>
                    <TableCell>
                      {isCurrent && <Badge variant="default">{t("sessions.currentLabel")}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isCurrent || isRevoking}
                        aria-label={t("sessions.revokeAriaLabel", { device: deviceLabel })}
                        onClick={() => handleRevoke(session.id)}
                      >
                        {isRevoking ? t("sessions.revoking") : t("sessions.revoke")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
