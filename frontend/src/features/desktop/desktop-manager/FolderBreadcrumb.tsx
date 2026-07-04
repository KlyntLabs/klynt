import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";
import { useCurrentFolderContents } from "./use-current-folder";

type FolderBreadcrumbProps = {
  desktopId: string;
  titleMap?: Record<string, string>;
};

type Crumb = {
  id: string;
  title: string;
  index: number;
};

export function FolderBreadcrumb({
  desktopId,
  titleMap = {},
}: FolderBreadcrumbProps): React.JSX.Element {
  const { t } = useTranslation("home");
  const { path, navigateToRoot, navigateToIndex } = useCurrentFolderContents(desktopId);
  const tree = useIconTreeStore((s) => s.trees[desktopId]);

  const nodeTitleMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    function walk(items: IconTreeNode[]) {
      for (const node of items) {
        if (node.title) {
          map[node.appId] = node.title;
        }
        if (node.children) {
          walk(node.children);
        }
      }
    }
    walk(tree ?? []);
    return map;
  }, [tree]);

  const crumbs: Crumb[] = [
    { id: "__home__", title: t("desktop.breadcrumb.home"), index: -1 },
    ...path.map((appId, index) => ({
      id: appId,
      title: titleMap[appId] ?? nodeTitleMap[appId] ?? t("desktop.breadcrumb.folderFallback"),
      index,
    })),
  ];

  const handleClick = (index: number) => {
    if (index < 0) {
      navigateToRoot();
    } else {
      navigateToIndex(index);
    }
  };

  return (
    <Breadcrumb data-testid="folder-breadcrumb">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.id}-${crumb.index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={() => handleClick(crumb.index)}
                      className="cursor-pointer"
                    >
                      {crumb.title}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
