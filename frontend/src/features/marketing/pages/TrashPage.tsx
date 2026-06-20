import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Lock,
  Music,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ──────────────────────────── types ──────────────────────────── */

interface TrashItem {
  id: string;
  filename: string;
  type: "markdown" | "image" | "spreadsheet" | "audio" | "pdf" | "json" | "csv" | "txt";
  size: string;
  dateDeleted: string;
  description: string;
  content: string | string[];
  redacted?: boolean;
  redactedReason?: string;
}

/* ──────────────────────────── helpers ──────────────────────────── */

function getFileIcon(type: TrashItem["type"]) {
  switch (type) {
    case "image":
      return <ImageIcon className="w-8 h-8 text-[#2563EB]" />;
    case "spreadsheet":
    case "csv":
      return <FileSpreadsheet className="w-8 h-8 text-[#22C55E]" />;
    case "audio":
      return <Music className="w-8 h-8 text-[#F76E18]" />;
    case "pdf":
      return <FileText className="w-8 h-8 text-[#DC2626]" />;
    default:
      return <FileText className="w-8 h-8 text-[#6B6B6B]" />;
  }
}

/* ──────────────────────────── page ──────────────────────────── */

export default function TrashPage() {
  const { t } = useTranslation("marketing");
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);

  const trashItems = t("trash.items", { returnObjects: true }) as TrashItem[];
  const fileTypeLabels = t("trash.fileTypes", { returnObjects: true }) as Record<
    TrashItem["type"],
    string
  >;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between px-6 py-4 bg-[#F5F3EF] border-b border-[#E5E5E5] shrink-0"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-[#6B6B6B]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">{t("trash.header.title")}</span>
        </div>
        <span className="text-xs text-[#6B6B6B]">{t("trash.header.subtitle")}</span>
        <Badge
          variant="secondary"
          className="bg-[#E5E5E5] text-[#6B6B6B] text-xs px-2 py-0.5 rounded-full font-normal"
        >
          {t("trash.header.itemsCount", { count: trashItems.length })}
        </Badge>
      </motion.div>

      {/* Subtitle */}
      <div className="px-6 py-3 border-b border-[#E5E5E5] shrink-0">
        <p className="text-xs text-[#6B6B6B]">{t("trash.header.description")}</p>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trashItems.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedItem(item)}
                className="flex flex-col items-center p-4 border border-[#E5E5E5] rounded-md bg-white hover:shadow-sm hover:bg-[#FAFAF8] hover:border-[#D1D1D1] transition-all text-left cursor-pointer"
              >
                {item.redacted ? (
                  <Lock className="w-8 h-8 text-[#9CA3AF]" />
                ) : (
                  getFileIcon(item.type)
                )}
                <p className="text-xs font-medium text-center mt-3 break-words w-full line-clamp-2">
                  {item.filename}
                </p>
                <p className="text-[10px] text-[#9CA3AF] text-center mt-1">
                  {item.redacted ? t("trash.redacted") : fileTypeLabels[item.type]}
                </p>
                <div className="flex justify-between w-full mt-2 text-[10px] text-[#9CA3AF]">
                  <span>{item.size}</span>
                  <span>{item.dateDeleted}</span>
                </div>
                {!item.redacted && (
                  <p className="text-[10px] text-[#6B6B6B] text-center mt-2 line-clamp-2 leading-tight">
                    {item.description}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Detail Modal */}
      <Dialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <AnimatePresence>
          {selectedItem && (
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  {selectedItem.redacted ? (
                    <Lock className="w-4 h-4 text-[#9CA3AF]" />
                  ) : (
                    getFileIcon(selectedItem.type)
                  )}
                  <span className="truncate">{selectedItem.filename}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedItem.redacted ? selectedItem.redactedReason : selectedItem.description}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto my-4">
                {selectedItem.redacted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-[#F76E18] mb-3" />
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {t("trash.detail.niceTry")}
                    </p>
                    <p className="text-xs text-[#6B6B6B] mt-1">{selectedItem.redactedReason}</p>
                  </div>
                ) : (
                  <div className="bg-[#F5F3EF] rounded-md p-4">
                    <pre className="text-xs text-[#1A1A1A] whitespace-pre-wrap leading-relaxed font-mono">
                      {Array.isArray(selectedItem.content)
                        ? selectedItem.content.join("\n")
                        : selectedItem.content}
                    </pre>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-3 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-[10px] text-[#9CA3AF]">
                  {selectedItem.type.toUpperCase()} &bull; {selectedItem.size} &bull;{" "}
                  {t("trash.detail.deleted")} {selectedItem.dateDeleted}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  disabled
                  className="text-xs text-[#9CA3AF] bg-[#F0EDE6] px-3 py-1.5 rounded cursor-not-allowed opacity-60"
                  title={t("trash.detail.restoreTooltip")}
                >
                  {t("trash.detail.restore")}
                </button>
              </div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </div>
  );
}
