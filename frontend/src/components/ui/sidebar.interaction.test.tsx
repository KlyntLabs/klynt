import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "./sidebar";

describe("Sidebar interactions", () => {
  it("renders the open state", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("renders the sidebar in mobile state", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>Mobile content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Mobile content")).toBeInTheDocument();
  });

  it("renders collapsed sidebar with tooltip button", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Home">Home</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders sidebar with all sub-components", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar variant="floating" side="right">
          <SidebarHeader>
            <SidebarInput placeholder="Search" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <span>Group</span>
              </SidebarGroupLabel>
              <SidebarGroupAction>Add</SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton variant="outline" size="lg" isActive>
                      Item
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover>Action</SidebarMenuAction>
                    <SidebarMenuBadge>3</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton size="sm" isActive>
                        Sub
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger aria-label="Toggle sidebar" />
          <SidebarRail />
          Main
        </SidebarInset>
      </SidebarProvider>
    );
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle sidebar")).toBeInTheDocument();
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("renders non-collapsible sidebar", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="none">
          <SidebarContent>Fixed</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Fixed")).toBeInTheDocument();
  });

  it("supports controlled open state", () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarContent>Controlled</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Controlled")).toBeInTheDocument();
  });

  it("toggles via keyboard shortcut", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>Keyboard</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
  });

  it("toggles controlled sidebar via keyboard shortcut", () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarContent>Controlled keyboard</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalled();
  });

  it("calls onClick on sidebar trigger", () => {
    const onClick = vi.fn();
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>Trigger</SidebarContent>
        </Sidebar>
        <SidebarTrigger aria-label="Toggle sidebar" onClick={onClick} />
      </SidebarProvider>
    );
    fireEvent.click(screen.getByLabelText("Toggle sidebar"));
    expect(onClick).toHaveBeenCalled();
  });
});
