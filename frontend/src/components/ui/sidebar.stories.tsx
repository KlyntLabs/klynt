import type { Meta, StoryObj } from "@storybook/react";
import { HomeIcon, SettingsIcon, UserIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

const meta: Meta<typeof SidebarProvider> = {
  title: "UI/Sidebar",
  component: SidebarProvider,
};
export default meta;

type Story = StoryObj<typeof SidebarProvider>;

export const Default: Story = {
  render: (args) => (
    <SidebarProvider {...args} className="min-h-[400px]">
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 text-sm font-semibold">Klynt</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <HomeIcon />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <UserIcon />
                    <span>Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <SettingsIcon />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 text-xs text-muted-foreground">v1.0.0</div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="p-4">
        <SidebarTrigger />
        <div className="mt-4 text-sm">Main content area</div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
