import { format } from "date-fns";
import { useTranslation } from "react-i18next";
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

  const { data: sessions, isLoading } = useSessions();
  const revoke = useRevokeSession();

  const currentSessionId = sessions ? resolveCurrentSessionId(sessions) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sessions.title")}</CardTitle>
        <CardDescription>{t("sessions.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <SessionsTableSkeleton />}
        {!isLoading && sessions?.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("sessions.empty")}</p>
        )}
        {!isLoading && sessions && sessions.length > 0 && (
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
                return (
                  <TableRow key={session.id} data-testid={`session-row-${session.id}`}>
                    <TableCell className="font-medium">
                      {session.userAgent || session.kind}
                    </TableCell>
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
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate(session.id)}
                      >
                        {revoke.isPending ? t("sessions.revoking") : t("sessions.revoke")}
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
